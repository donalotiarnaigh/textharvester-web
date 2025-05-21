/**
 * Supported provider types
 * @enum {string}
 */
const PROVIDER_TYPES = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic'
};

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  maxTokens: 2000,
  temperature: 0.7,
  systemPromptTemplate: 'You are an AI assistant designed to help with tasks.',
  responseFormat: {
    type: 'text'
  }
};

/**
 * Provider-specific configurations
 */
const PROVIDER_CONFIGS = {
  [PROVIDER_TYPES.OPENAI]: {
    systemPromptTemplate: 'You are an AI assistant trained by OpenAI. {task}',
    responseFormat: {
      type: 'json',
      schema: {
        type: 'object',
        properties: {
          result: { type: 'string' }
        },
        required: ['result']
      }
    }
  },
  [PROVIDER_TYPES.ANTHROPIC]: {
    systemPromptTemplate: 'You are Claude, an AI assistant created by Anthropic. {task}',
    responseFormat: {
      type: 'markdown'
    }
  }
};

/**
 * Represents a provider configuration
 */
class ProviderConfig {
  /**
   * @param {Object} config - Provider configuration
   * @param {string} config.name - Provider name
   * @param {PROVIDER_TYPES} config.type - Provider type
   * @param {number} [config.maxTokens] - Maximum tokens
   * @param {number} [config.temperature] - Temperature for response generation
   * @param {string} [config.systemPromptTemplate] - System prompt template
   * @param {Object} [config.responseFormat] - Response format configuration
   */
  constructor(config) {
    this.validateConfig(config);
    
    this.name = config.name;
    this.type = config.type;
    this.maxTokens = config.maxTokens || DEFAULT_CONFIG.maxTokens;
    this.temperature = config.temperature || DEFAULT_CONFIG.temperature;
    this.systemPromptTemplate = config.systemPromptTemplate || 
      (PROVIDER_CONFIGS[config.type]?.systemPromptTemplate || DEFAULT_CONFIG.systemPromptTemplate);
    this.responseFormat = config.responseFormat || 
      (PROVIDER_CONFIGS[config.type]?.responseFormat || DEFAULT_CONFIG.responseFormat);
    
    this.validateResponseFormat();
  }

  /**
   * Validate provider configuration
   * @private
   * @param {Object} config - Configuration to validate
   */
  validateConfig(config) {
    if (!config.name) {
      throw new Error('Provider name is required');
    }
    if (!config.type) {
      throw new Error('Provider type is required');
    }
    if (!Object.values(PROVIDER_TYPES).includes(config.type)) {
      throw new Error('Invalid provider type');
    }
  }

  /**
   * Validate response format configuration
   * @private
   */
  validateResponseFormat() {
    const validTypes = ['text', 'json', 'markdown'];
    if (!validTypes.includes(this.responseFormat.type)) {
      throw new Error('Invalid response format type');
    }
    if (this.responseFormat.type === 'json' && !this.responseFormat.schema) {
      throw new Error('Schema is required for JSON response format');
    }
  }

  /**
   * Format system prompt with parameters
   * @param {Object} params - Parameters for formatting
   * @param {string} params.task - Task description
   * @returns {string} Formatted system prompt
   */
  formatSystemPrompt(params) {
    if (!params.task) {
      throw new Error('Task is required');
    }
    return this.systemPromptTemplate.replace('{task}', params.task);
  }
}

/**
 * Create a provider configuration
 * @param {string} providerName - Name of the provider
 * @returns {ProviderConfig} Provider configuration
 */
function createProviderConfig(providerName) {
  const type = PROVIDER_TYPES[providerName.toUpperCase()];
  if (!type) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  // Import provider-specific configurations
  const OpenAIConfig = require('./openaiConfig');
  const AnthropicConfig = require('./anthropicConfig');

  switch (type) {
    case PROVIDER_TYPES.OPENAI:
      return new OpenAIConfig();
    case PROVIDER_TYPES.ANTHROPIC:
      return new AnthropicConfig();
    default:
      return new ProviderConfig({
        name: providerName,
        type,
        ...PROVIDER_CONFIGS[type]
      });
  }
}

module.exports = {
  ProviderConfig,
  createProviderConfig,
  PROVIDER_TYPES,
  DEFAULT_CONFIG,
  PROVIDER_CONFIGS
}; 