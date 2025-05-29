/**
 * Validates if a received value matches the expected type definition
 * @param {Object} expected - Type definition object
 * @param {*} received - Value to validate
 * @returns {boolean} - Whether the types match
 */
function validateTypeMatch(expected, received) {
  if (!expected || !expected.type) {
    return false;
  }

  switch (expected.type) {
  case 'string':
    return typeof received === 'string';
  case 'number':
    return typeof received === 'number';
  case 'boolean':
    return typeof received === 'boolean';
  case 'object':
    if (typeof received !== 'object' || received === null) {
      return false;
    }
    if (expected.properties) {
      return Object.entries(expected.properties).every(([key, propType]) => {
        return validateTypeMatch(propType, received[key]);
      });
    }
    return true;
  default:
    return false;
  }
}

/**
 * Creates appropriate feedback messages based on error type
 * @param {string} type - Type of feedback message
 * @param {Object} params - Parameters for the message
 * @returns {string} - Formatted feedback message
 */
function createFeedbackMessage(type, params = {}) {
  switch (type) {
  case 'type_mismatch':
    return `Type mismatch for field "${params.field}": expected ${params.expected} but received ${params.received}`;
  case 'prompt_error':
    return `Prompt Error: ${params.error}`;
  case 'unknown_error':
  default:
    return 'An unexpected error occurred';
  }
}

/**
 * Generates loading messages for different processing stages
 * @param {string} stage - Current processing stage
 * @param {Object} params - Additional parameters for the message
 * @returns {string} - Formatted loading message
 */
function updateLoadingMessage(stage, params = {}) {
  switch (stage) {
  case 'processing_prompt':
    return `Processing ${params.template} template (v${params.version})...`;
  case 'validating':
    return 'Validating data types...';
  default:
    return 'Processing...';
  }
}

module.exports = {
  validateTypeMatch,
  createFeedbackMessage,
  updateLoadingMessage
}; 