const logger = require('./logger');

/**
 * Validates and converts data types according to schema
 * @param {Object} data - The data object to validate
 * @returns {Object} - The validated and converted data object
 */
function validateAndConvertTypes(data) {
  const result = { ...data };

  // Convert memorial_number field - preserve as string to maintain leading zeros
  if ('memorial_number' in data) {
    if (data.memorial_number === null || data.memorial_number === '') {
      result.memorial_number = null;
    } else {
      // Keep as string to preserve leading zeros (e.g., "0123" stays "0123")
      result.memorial_number = String(data.memorial_number);
    }
  }

  if ('year_of_death' in data) {
    if (data.year_of_death === null || data.year_of_death === '') {
      result.year_of_death = null;
    } else {
      result.year_of_death = parseInt(data.year_of_death, 10);
      if (isNaN(result.year_of_death)) {
        logger.warn(`Invalid year_of_death: ${data.year_of_death}`);
        result.year_of_death = null;
      }
    }
  }

  // Ensure string fields are strings or null
  ['first_name', 'last_name', 'inscription', 'ai_provider', 'model_version', 'prompt_version'].forEach(field => {
    if (field in data) {
      if (data[field] === null || data[field] === undefined) {
        result[field] = null;
      } else {
        result[field] = String(data[field]);
      }
    }
  });

  return result;
}

/**
 * Validates and converts an array of memorial records
 * @param {Array} records - Array of memorial records
 * @returns {Array} - Array of validated and converted records
 */
function validateAndConvertRecords(records) {
  if (!Array.isArray(records)) {
    logger.error('Invalid records format: expected array');
    return [];
  }

  return records.map(record => validateAndConvertTypes(record));
}

module.exports = {
  validateAndConvertTypes,
  validateAndConvertRecords
}; 