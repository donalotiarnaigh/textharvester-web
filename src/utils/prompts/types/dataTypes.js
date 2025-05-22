/**
 * Base class for all data types
 */
class DataType {
  /**
   * @param {string} name - The name of the data type
   * @param {function} validator - Function to validate values of this type
   */
  constructor(name, validator) {
    this.name = name;
    this.validator = validator;
  }

  /**
   * Validate if a value matches this type
   * @param {*} value - The value to validate
   * @param {Object} metadata - Metadata for validation
   * @returns {Object} - Validation result with value and errors
   */
  validate(value, metadata = {}) {
    const errors = [];
    let convertedValue = value;

    // Handle required fields first
    if (metadata.required && (value === null || value === undefined)) {
      errors.push('Value is required');
      return { value: null, errors };
    }

    // Return null for null/undefined values if not required
    if (value === null || value === undefined) {
      return { value: null, errors };
    }

    try {
      convertedValue = this.convert(value, metadata);
    } catch (error) {
      errors.push(error.message);
      return { value: null, errors };
    }

    if (!this.validator(convertedValue)) {
      errors.push(`Invalid ${this.name} value: ${value}`);
      return { value: null, errors };
    }

    const metadataErrors = this.validateMetadata(convertedValue, metadata);
    if (metadataErrors.length > 0) {
      return { value: null, errors: metadataErrors };
    }

    return { value: convertedValue, errors: [] };
  }

  /**
   * Validate value against metadata constraints
   * @param {*} value - The value to validate
   * @param {Object} metadata - Metadata for validation
   * @returns {string[]} - Array of error messages
   */
  validateMetadata(value, metadata) {
    const errors = [];

    if (metadata.required && (value === null || value === undefined)) {
      errors.push('Value is required');
    }

    return errors;
  }

  /**
   * Convert a value to this type
   * @param {*} value - The value to convert
   * @param {Object} metadata - Metadata for conversion
   * @returns {*} - The converted value
   */
  convert(value, metadata = {}) {
    throw new Error('Convert method must be implemented by subclasses');
  }
}

/**
 * String data type implementation
 */
class StringType extends DataType {
  constructor() {
    super('string', (value) => typeof value === 'string');
  }

  convert(value, metadata = {}) {
    if (value === null || value === undefined) {
      return null;
    }
    const converted = String(value).trim();
    return converted;
  }

  validateMetadata(value, metadata) {
    const errors = super.validateMetadata(value, metadata);
    
    if (value === null) {
      return errors;
    }

    if (metadata.maxLength && value.length > metadata.maxLength) {
      errors.push(`Value exceeds maximum length of ${metadata.maxLength} characters`);
    }

    if (metadata.format) {
      switch (metadata.format) {
        case 'email':
          if (!value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            errors.push('Invalid email format');
          }
          break;
        case 'name':
          // Enhanced name validation - much more flexible
          // Allows letters, spaces, hyphens, apostrophes, periods, and accented characters
          if (!value.match(/^[A-Za-zÀ-ÖØ-öø-ÿ\s\-'.]+$/)) {
            errors.push('Invalid name format');
          }
          break;
        case 'identifier':
          // Alphanumeric with limited special characters
          if (!value.match(/^[A-Za-z0-9\-_]+$/)) {
            errors.push('Invalid identifier format');
          }
          break;
      }
    }

    return errors;
  }
}

/**
 * Integer data type implementation
 */
class IntegerType extends DataType {
  constructor() {
    super('integer', (value) => Number.isInteger(value));
  }

  convert(value, metadata = {}) {
    if (value === null || value === undefined) {
      return null;
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`Cannot convert value "${value}" to integer`);
    }
    return num;
  }

  validateMetadata(value, metadata) {
    const errors = super.validateMetadata(value, metadata);
    
    if (value === null) {
      return errors;
    }

    if (metadata.min !== undefined && metadata.max !== undefined && (value < metadata.min || value > metadata.max)) {
      errors.push(`Value must be between ${metadata.min} and ${metadata.max}`);
    } else {
      if (metadata.min !== undefined && value < metadata.min) {
        errors.push(`Value must be greater than or equal to ${metadata.min}`);
      }
      if (metadata.max !== undefined && value > metadata.max) {
        errors.push(`Value must be less than or equal to ${metadata.max}`);
      }
    }

    return errors;
  }
}

/**
 * Float data type implementation
 */
class FloatType extends DataType {
  constructor() {
    super('float', (value) => typeof value === 'number' && !isNaN(value));
  }

  convert(value, metadata = {}) {
    if (value === null || value === undefined) {
      return null;
    }
    let num = parseFloat(value);
    if (isNaN(num)) {
      throw new Error(`Cannot convert value "${value}" to float`);
    }

    // Apply min/max constraints before precision
    if (metadata.min !== undefined && num < metadata.min) {
      throw new Error(`Value must be between ${metadata.min} and ${metadata.max}`);
    }
    if (metadata.max !== undefined && num > metadata.max) {
      throw new Error(`Value must be between ${metadata.min} and ${metadata.max}`);
    }

    // Apply precision after constraints
    if (metadata.precision !== undefined) {
      const multiplier = Math.pow(10, metadata.precision);
      num = Math.round(num * multiplier) / multiplier;
    }
    return num;
  }

  validateMetadata(value, metadata) {
    const errors = super.validateMetadata(value, metadata);
    
    if (value === null) {
      return errors;
    }

    if (metadata.min !== undefined && metadata.max !== undefined && (value < metadata.min || value > metadata.max)) {
      errors.push(`Value must be between ${metadata.min} and ${metadata.max}`);
    } else {
      if (metadata.min !== undefined && value < metadata.min) {
        errors.push(`Value must be greater than or equal to ${metadata.min}`);
      }
      if (metadata.max !== undefined && value > metadata.max) {
        errors.push(`Value must be less than or equal to ${metadata.max}`);
      }
    }

    return errors;
  }
}

/**
 * Boolean data type implementation
 */
class BooleanType extends DataType {
  constructor() {
    super('boolean', (value) => typeof value === 'boolean');
  }

  convert(value, metadata = {}) {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      const lowered = value.toLowerCase().trim();
      if (lowered === 'true') return true;
      if (lowered === 'false') return false;
      throw new Error('Invalid boolean value');
    }
    if (typeof value === 'boolean') {
      return value;
    }
    throw new Error('Invalid boolean value');
  }
}

/**
 * Date data type implementation
 */
class DateType extends DataType {
  constructor() {
    super('date', (value) => value instanceof Date && !isNaN(value));
  }

  convert(value, metadata = {}) {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    const date = new Date(value);
    if (isNaN(date)) {
      throw new Error('Invalid date value');
    }
    return date;
  }

  validateMetadata(value, metadata) {
    const errors = super.validateMetadata(value, metadata);
    
    if (value === null) {
      return errors;
    }

    if (metadata.min && value < new Date(metadata.min)) {
      errors.push(`Date must be after ${metadata.min}`);
    }

    if (metadata.max && value > new Date(metadata.max)) {
      errors.push(`Date must be before ${metadata.max}`);
    }

    return errors;
  }
}

// Type instances
const TYPES = {
  string: new StringType(),
  integer: new IntegerType(),
  float: new FloatType(),
  boolean: new BooleanType(),
  date: new DateType()
};

/**
 * Check if a type is supported
 * @param {string} type Type to check
 * @returns {boolean} True if type is supported
 */
function isValidType(type) {
  return typeof type === 'string' && type.toLowerCase() in TYPES;
}

/**
 * Convert and validate a value to the specified type
 * @param {*} value Value to convert
 * @param {string} type Target type
 * @param {Object} metadata Metadata for validation
 * @returns {Object} Validation result with value and errors
 */
function validateValue(value, type, metadata = {}) {
  const typeInstance = TYPES[type.toLowerCase()];
  if (!typeInstance) {
    throw new Error(`Unsupported type: ${type}`);
  }
  return typeInstance.validate(value, metadata);
}

module.exports = {
  DataType,
  StringType,
  IntegerType,
  FloatType,
  BooleanType,
  DateType,
  isValidType,
  validateValue,
  TYPES
}; 