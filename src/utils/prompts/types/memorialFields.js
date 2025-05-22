const { StringType, IntegerType } = require('./dataTypes');

/**
 * Represents a field in a memorial record with type information and metadata
 */
class MemorialField {
  /**
   * @param {string} name - The name of the field
   * @param {string} type - The data type of the field
   * @param {Object} metadata - Additional field metadata
   * @param {string} [metadata.description=''] - Description of the field
   * @param {boolean} [metadata.required=false] - Whether the field is required
   * @param {function} [metadata.transform=(value) => value] - Transform function for the field value
   */
  constructor(name, type, metadata = {}) {
    this.name = name;
    this.type = type;
    this.description = metadata.description || '';
    this.required = metadata.required || false;
    this.transform = metadata.transform || ((value) => value);
  }

  /**
   * Validates a value against this field's type
   * @param {*} value - The value to validate
   * @throws {Error} If the value is invalid for this field's type
   */
  validate(value) {
    if (this.required && (value === undefined || value === null)) {
      throw new Error(`Missing required field: ${this.name}`);
    }
    if (value !== undefined && value !== null) {
      if (!this.type.validate(value)) {
        throw new Error(`Invalid value "${value}" for type ${this.type.name}`);
      }
    }
  }
}

/**
 * Definitions for all memorial record fields
 */
const MEMORIAL_FIELDS = {
  memorial_number: new MemorialField('memorial_number', 'string', {
    description: 'Unique identifier for the memorial record (e.g. HG123)',
    required: true,
    transform: (value) => value.trim()
  }),

  first_name: new MemorialField('first_name', 'string', {
    description: 'First name of the primary person commemorated on the memorial',
    required: true,
    transform: (value) => value.trim().toUpperCase()
  }),

  last_name: new MemorialField('last_name', 'string', {
    description: 'Last name/surname of the primary person commemorated on the memorial',
    required: true,
    transform: (value) => value.trim().toUpperCase()
  }),

  year_of_death: new MemorialField('year_of_death', 'integer', {
    description: 'Year of death for the primary person commemorated on the memorial',
    required: true,
    metadata: {
      min: 1500,
      max: new Date().getFullYear()
    }
  }),

  inscription: new MemorialField('inscription', 'string', {
    description: 'Full text inscription from the memorial, including any additional commemorated individuals',
    required: false,
    transform: (value) => value.trim()
  })
};

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
  transformMemorialData
}; 