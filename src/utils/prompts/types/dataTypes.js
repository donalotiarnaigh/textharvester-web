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
   * @returns {boolean} - Whether the value is valid for this type
   */
  validate(value) {
    return this.validator(value);
  }

  /**
   * Convert a value to this type
   * @param {*} value - The value to convert
   * @returns {*} - The converted value
   */
  convert(value) {
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

  convert(value) {
    if (value === null || value === undefined) {
      throw new Error('Cannot convert null or undefined to string');
    }
    return String(value);
  }
}

/**
 * Integer data type implementation
 */
class IntegerType extends DataType {
  constructor() {
    super('integer', (value) => Number.isInteger(value));
  }

  convert(value) {
    if (value === null || value === undefined) {
      throw new Error('Cannot convert null or undefined to integer');
    }
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Cannot convert value "${value}" to integer`);
    }
    return Math.floor(num);
  }
}

/**
 * Boolean data type implementation
 */
class BooleanType extends DataType {
  constructor() {
    super('boolean', (value) => typeof value === 'boolean');
  }

  convert(value) {
    if (value === null || value === undefined) {
      throw new Error('Cannot convert null or undefined to boolean');
    }
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return false;
  }
}

/**
 * Validate a value against a specified type
 * @param {*} value - The value to validate
 * @param {DataType} type - The type to validate against
 * @throws {Error} If the value is invalid for the specified type
 */
function validateValue(value, type) {
  if (value === null || value === undefined) {
    throw new Error(`Value cannot be ${value}`);
  }
  if (!type.validate(value)) {
    throw new Error(`Invalid value "${value}" for type ${type.name}`);
  }
}

/**
 * Supported data types
 */
const SUPPORTED_TYPES = ['string', 'integer', 'float', 'boolean', 'date'];

/**
 * Check if a type is supported
 * @param {string} type Type to check
 * @returns {boolean} True if type is supported
 */
function isValidType(type) {
  return SUPPORTED_TYPES.includes(type.toLowerCase());
}

/**
 * Convert a value to the specified type
 * @param {*} value Value to convert
 * @param {string} type Target type
 * @returns {*} Converted value
 * @throws {Error} If conversion fails
 */
function convertValue(value, type) {
  switch (type.toLowerCase()) {
    case 'string':
      return String(value);
    
    case 'integer':
      if (typeof value === 'number' && Number.isInteger(value)) {
        return value;
      }
      const intValue = parseInt(value, 10);
      if (isNaN(intValue)) {
        throw new Error('Invalid integer value');
      }
      return intValue;
    
    case 'float':
      if (typeof value === 'number') {
        return value;
      }
      const floatValue = parseFloat(value);
      if (isNaN(floatValue)) {
        throw new Error('Invalid float value');
      }
      return floatValue;
    
    case 'boolean':
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        const lowered = value.toLowerCase();
        if (lowered === 'true') return true;
        if (lowered === 'false') return false;
      }
      return false;
    
    case 'date':
      if (value instanceof Date) {
        if (isNaN(value)) {
          throw new Error('Invalid date value');
        }
        return value;
      }
      const dateValue = new Date(value);
      if (isNaN(dateValue)) {
        throw new Error('Invalid date value');
      }
      return dateValue;
    
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}

module.exports = {
  DataType,
  StringType,
  IntegerType,
  BooleanType,
  validateValue,
  SUPPORTED_TYPES,
  isValidType,
  convertValue
}; 