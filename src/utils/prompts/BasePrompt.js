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
   * @param {Object|Array} fields Field definitions
   * @returns {Object|Array} Validated field definitions
   */
  _validateFields(fields) {
    // If fields is an array (like MEMORIAL_FIELDS), return as is
    if (Array.isArray(fields)) {
      return fields;
    }

    // Original object validation logic
    for (const [fieldName, field] of Object.entries(fields)) {
      if (!field.type || (typeof field.type === 'string' && !dataTypes.isValidType(field.type)) || 
          (typeof field.type === 'object' && !field.type.name)) {
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
    // Handle both array and object field formats
    const field = Array.isArray(this.fields) 
      ? this.fields.find(f => f.name === fieldName)
      : this.fields[fieldName];

    if (!field) {
      throw new Error(`Unknown field: ${fieldName}`);
    }

    // For array format (MemorialField objects), use the field's validate method
    if (typeof field.validate === 'function') {
      const result = field.validate(value);
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0]);
      }
      return result.value;
    }

    // For object format, use the original validation logic
    const fieldType = typeof field.type === 'object' ? field.type.name : field.type;
    const result = dataTypes.validateValue(value, fieldType, field.metadata);
    
    if (result.errors.length > 0) {
      const errorMessages = result.errors.map(error => 
        error.replace('Value', fieldName.charAt(0).toUpperCase() + fieldName.slice(1))
      );
      throw new Error(errorMessages[0]);
    }

    return result.value;
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
   * Get provider-specific field formatting
   * @param {string} provider Provider name
   * @returns {Object} Provider-specific field definitions
   */
  getProviderFields(provider) {
    this.validateProvider(provider);
    const config = createProviderConfig(provider);
    const result = {};

    for (const [name, field] of Object.entries(this.fields)) {
      result[name] = {
        ...field,
        format: config.getFieldFormat(field.type)
      };
    }

    return result;
  }

  /**
   * Format response for specific provider
   * @param {string} provider Provider name
   * @param {Object} data Response data
   * @returns {Object} Provider-specific formatted response
   */
  formatProviderResponse(provider, data) {
    this.validateProvider(provider);
    const validatedData = this.validateAndConvert(data);

    switch (provider.toLowerCase()) {
      case 'openai':
        return {
          response_format: { type: 'json' },
          content: validatedData
        };
      
      case 'anthropic':
        return {
          messages: [{
            role: 'assistant',
            content: JSON.stringify(validatedData, null, 2)
          }]
        };
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Get provider-specific validation rules
   * @param {string} provider Provider name
   * @returns {Object} Provider validation rules
   */
  getProviderValidationRules(provider) {
    this.validateProvider(provider);
    const config = createProviderConfig(provider);

    switch (provider.toLowerCase()) {
      case 'openai':
        return {
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          responseFormat: { type: 'json' }
        };
      
      case 'anthropic':
        return {
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          format: 'json'
        };
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Validate provider-specific response format
   * @param {string} provider Provider name
   * @param {Object} response Provider response
   * @throws {Error} If response format is invalid
   */
  validateProviderResponse(provider, response) {
    this.validateProvider(provider);

    switch (provider.toLowerCase()) {
      case 'openai':
        if (!response.response_format || response.response_format.type !== 'json') {
          throw new Error('Invalid OpenAI response format');
        }
        if (response.content?.error === 'token_limit_exceeded') {
          throw new Error('OpenAI token limit exceeded');
        }
        break;
      
      case 'anthropic':
        if (!response.messages || !Array.isArray(response.messages)) {
          throw new Error('Invalid Anthropic response format');
        }
        const content = response.messages[0]?.content;
        try {
          JSON.parse(content);
        } catch (error) {
          throw new Error('Invalid JSON in Anthropic response');
        }
        break;
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
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

    // Format field descriptions with provider-specific types
    const providerFields = this.getProviderFields(provider);
    const fieldDescriptions = Object.entries(providerFields)
      .map(([name, field]) => `${name} (${field.format}): ${field.description}`)
      .join('\n');

    // Get provider-specific validation rules
    const validationRules = this.getProviderValidationRules(provider);

    return {
      systemPrompt: config.systemPromptTemplate,
      userPrompt: `${basePrompt}\n\nField Definitions:\n${fieldDescriptions}\n\nValidation Rules:\n${JSON.stringify(validationRules, null, 2)}\n\n${config.formatInstructions || ''}`
    };
  }

  /**
   * Validate response data against field definitions
   * @param {Object} data Response data from AI model
   * @returns {Object} Validated and converted data
   * @throws {Error} If validation fails with details about the failures
   */
  validateAndConvert(data) {
    const result = {};
    const errors = [];
    
    // First pass: validate required fields are present
    for (const [fieldName, field] of Object.entries(this.fields)) {
      if (field.metadata?.required && !(fieldName in data)) {
        errors.push(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`);
      }
    }

    // Second pass: validate and convert each field
    for (const [fieldName, field] of Object.entries(this.fields)) {
      try {
        const value = fieldName in data ? data[fieldName] : null;
        result[fieldName] = this.validateField(fieldName, value);
      } catch (error) {
        errors.push(error.message);
      }
    }

    if (errors.length > 0) {
      const error = new Error(errors[0]);
      error.details = errors;
      throw error;
    }

    return result;
  }
}

module.exports = BasePrompt; 