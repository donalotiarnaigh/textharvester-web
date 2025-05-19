/**
 * Base class for all OCR prompts
 * Provides common functionality for prompt management and type validation
 */
class BasePrompt {
  /**
   * Create a new prompt instance
   * @param {Object} config Configuration options
   * @param {string} config.version Prompt version
   * @param {string[]} config.modelTargets List of supported AI models
   * @param {string} config.description Human-readable prompt description
   * @param {Object} config.typeDefinitions Type definitions for expected fields
   */
  constructor(config = {}) {
    this.version = config.version || '1.0.0';
    this.modelTargets = config.modelTargets || ['openai', 'anthropic'];
    this.description = config.description || '';
    this.typeDefinitions = config.typeDefinitions || {};
  }

  /**
   * Get the prompt text with type information
   * @returns {string} Complete prompt text
   * @abstract This method should be implemented by subclasses
   */
  getPromptText() {
    throw new Error('Method not implemented in base class');
  }

  /**
   * Get the appropriate prompt for a specific AI provider
   * @param {string} provider AI provider name
   * @returns {string} Provider-specific prompt
   */
  getProviderPrompt(provider) {
    return this.getPromptText();
  }

  /**
   * Validate response data against type definitions
   * @param {Object} data Response data from AI model
   * @returns {Object} Validated and converted data
   */
  validateAndConvert(data) {
    const result = {};
    
    for (const [key, type] of Object.entries(this.typeDefinitions)) {
      if (data[key] === null || data[key] === undefined) {
        result[key] = null;
        continue;
      }
      
      try {
        switch (type.toLowerCase()) {
          case 'integer':
            result[key] = data[key] === null ? null : parseInt(data[key], 10) || null;
            break;
          case 'float':
            result[key] = data[key] === null ? null : parseFloat(data[key]) || null;
            break;
          case 'boolean':
            result[key] = data[key] === null ? null : Boolean(data[key]);
            break;
          case 'date':
            result[key] = data[key] === null ? null : new Date(data[key]);
            if (result[key] instanceof Date && isNaN(result[key])) {
              result[key] = null;
            }
            break;
          case 'string':
          default:
            result[key] = data[key];
        }
      } catch (error) {
        result[key] = null;
      }
    }
    
    return result;
  }
}

module.exports = BasePrompt; 