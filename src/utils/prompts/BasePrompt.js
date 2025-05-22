const { PROVIDER_TYPES, createProviderConfig } = require('./providers/providerConfig');
const dataTypes = require('./types/dataTypes');

/**
 * Base class for all prompts
 * Provides common functionality for prompt management and type validation
 */
class BasePrompt {
  /**
   * Create a new prompt instance
   * @param {Object} config Configuration options
   * @param {string} config.version Prompt version
   * @param {string} config.description Human-readable prompt description
   * @param {Object} config.fields Field definitions with types and descriptions
   * @param {string[]} config.providers List of supported AI providers
   */
  constructor(config = {}) {
    this.version = config.version || '1.0.0';
    this.description = config.description || '';
    this.fields = this._validateFields(config.fields || {});
    this.providers = config.providers || ['openai', 'anthropic'];
  }

  /**
   * Validate field definitions
   * @private
   * @param {Object} fields Field definitions
   * @returns {Object} Validated field definitions
   */
  _validateFields(fields) {
    for (const [fieldName, field] of Object.entries(fields)) {
      if (!field.type || !dataTypes.isValidType(field.type)) {
        throw new Error(`Unsupported field type: ${field.type}`);
      }
      if (!field.description) {
        field.description = fieldName; // Use field name as default description
      }
    }
    return fields;
  }

  /**
   * Validate a single field value
   * @param {string} fieldName Name of the field to validate
   * @param {*} value Value to validate
   * @returns {*} Validated and converted value
   */
  validateField(fieldName, value) {
    const field = this.fields[fieldName];
    if (!field) {
      throw new Error(`Unknown field: ${fieldName}`);
    }

    if (value === null || value === undefined) {
      return null;
    }

    try {
      return dataTypes.convertValue(value, field.type);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate provider support
   * @param {string} provider Provider name to validate
   * @throws {Error} If provider is not supported
   */
  validateProvider(provider) {
    if (!this.providers.includes(provider.toLowerCase())) {
      throw new Error(`Provider not supported: ${provider}`);
    }
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
   * @returns {Object} Provider-specific prompt configuration
   */
  getProviderPrompt(provider) {
    this.validateProvider(provider);
    const config = createProviderConfig(provider);
    const basePrompt = this.getPromptText();

    // Format field descriptions
    const fieldDescriptions = Object.entries(this.fields)
      .map(([name, field]) => `${name} (${field.type}): ${field.description}`)
      .join('\n');

    return {
      systemPrompt: config.systemPromptTemplate,
      userPrompt: `${basePrompt}\n\nField Definitions:\n${fieldDescriptions}\n\n${config.formatInstructions || ''}`
    };
  }

  /**
   * Validate response data against field definitions
   * @param {Object} data Response data from AI model
   * @returns {Object} Validated and converted data
   */
  validateAndConvert(data) {
    const result = {};
    
    for (const fieldName of Object.keys(this.fields)) {
      const value = data[fieldName];
      result[fieldName] = this.validateField(fieldName, value);
    }
    
    return result;
  }
}

module.exports = BasePrompt; 