const { StringType, IntegerType } = require('./dataTypes');

// Import the name processing utilities
const { handleInitials, preprocessName } = require('../../nameProcessing');

/**
 * Represents a field in a memorial record with type information and metadata
 */
class MemorialField {
  /**
   * @param {string} name - The name of the field
   * @param {string|Object} type - The data type of the field
   * @param {Object} metadata - Additional field metadata
   * @param {string} [metadata.description=''] - Description of the field
   * @param {boolean} [metadata.required=false] - Whether the field is required
   * @param {function} [metadata.transform=(value) => value] - Transform function for the field value
   * @param {Object} [metadata.validation={}] - Validation options
   */
  constructor(name, type, metadata = {}) {
    this.name = name;
    
    // Handle type - could be string name or type object
    if (typeof type === 'string') {
      // Convert string type to appropriate type object
      switch (type) {
        case 'string':
          this.type = new StringType();
          break;
        case 'integer':
          this.type = new IntegerType();
          break;
        default:
          throw new Error(`Unknown type: ${type}`);
      }
    } else {
      this.type = type;
    }
    
    this.description = metadata.description || '';
    this.required = metadata.required || false;
    this.transform = metadata.transform || ((value) => value);
    this.validation = metadata.validation || {};
  }

  /**
   * Validates a value against this field's type
   * @param {*} value - The value to validate
   * @throws {Error} If the value is invalid for this field's type
   */
  validate(value) {
    // Check if required
    if (this.required && (value === undefined || value === null || value === '')) {
      throw new Error(`Missing required field: ${this.name}`);
    }
    
    // Skip validation for empty values if not required
    if (!this.required && (value === undefined || value === null || value === '')) {
      return true;
    }
    
    // Validate against type
    if (value !== undefined && value !== null) {
      const result = this.type.validate(value, this.validation);
      if (result.errors && result.errors.length > 0) {
        throw new Error(`Invalid value "${value}" for field ${this.name}: ${result.errors.join(', ')}`);
      }
      return true;
    }
    
    return true;
  }
}

// Name regex patterns - more flexible than before
const NAME_PATTERNS = {
  // Enhanced pattern allowing accents, apostrophes, hyphens, and spaces
  STANDARD: /^[A-Za-zÀ-ÖØ-öø-ÿ\s\-'.]+$/,
  // Pattern for initials
  INITIALS: /^([A-Za-z]\.){1,5}$|^[A-Za-z]([A-Za-z]\s*){0,4}$/
};

/**
 * Definitions for all memorial record fields
 */
const MEMORIAL_FIELDS = {
  memorial_number: new MemorialField('memorial_number', 'string', {
    description: 'Unique identifier for the memorial record (e.g. HG123)',
    required: true,
    transform: (value) => value === null ? null : value.trim(),
    validation: {
      format: 'identifier'
    }
  }),

  first_name: new MemorialField('first_name', 'string', {
    description: 'First name of the primary person commemorated on the memorial',
    required: false,
    transform: (value) => {
      if (value === null || value === undefined) return '';
      
      // Standardize value
      let processed = value.trim();
      
      // Handle initials: convert "J R" to "J.R."
      if (handleInitials.isInitials(processed)) {
        return handleInitials(processed);
      }
      
      // Standard uppercase conversion
      return processed.toUpperCase();
    },
    validation: {
      format: 'name'
    }
  }),

  last_name: new MemorialField('last_name', 'string', {
    description: 'Last name/surname of the primary person commemorated on the memorial',
    required: true,
    transform: (value) => {
      if (value === null || value === undefined) return null;
      
      // Standardize value and convert to uppercase
      return value.trim().toUpperCase();
    },
    validation: {
      format: 'name'
    }
  }),

  year_of_death: new MemorialField('year_of_death', 'integer', {
    description: 'Year of death for the primary person commemorated on the memorial',
    required: false,
    validation: {
      min: 1500,
      max: new Date().getFullYear()
    }
  }),

  inscription: new MemorialField('inscription', 'string', {
    description: 'Full text inscription from the memorial, including any additional commemorated individuals',
    required: false,
    transform: (value) => value === null ? null : value.trim()
  })
};

/**
 * Processes raw name input and extracts structured components
 * @param {string} fullName - The complete name to process
 * @returns {Object} Object with first_name, last_name, prefix, and suffix
 */
function processFullName(fullName) {
  if (!fullName) return { first_name: '', last_name: '' };
  
  const processed = preprocessName(fullName);
  
  return {
    first_name: processed.firstName || '',
    last_name: processed.lastName || '',
    ...(processed.prefix ? { prefix: processed.prefix } : {}),
    ...(processed.suffix ? { suffix: processed.suffix } : {})
  };
}

/**
 * Validates a complete memorial data object
 * @param {Object} data - The memorial data to validate
 * @throws {Error} If any field validation fails
 */
function validateMemorialData(data) {
  Object.values(MEMORIAL_FIELDS).forEach(field => {
    field.validate(data[field.name]);
  });
}

/**
 * Transforms memorial data by applying field-specific transformations
 * @param {Object} data - The memorial data to transform
 * @returns {Object} The transformed memorial data
 */
function transformMemorialData(data) {
  const transformed = {};
  
  Object.values(MEMORIAL_FIELDS).forEach(field => {
    if (data[field.name] !== undefined) {
      transformed[field.name] = field.transform(data[field.name]);
    }
  });

  return transformed;
}

module.exports = {
  MemorialField,
  MEMORIAL_FIELDS,
  validateMemorialData,
  transformMemorialData,
  processFullName,
  NAME_PATTERNS
}; 