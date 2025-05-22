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

const TYPE_FORMATS = {
  [PROVIDER_TYPES.OPENAI]: {
    string: 'text',
    integer: 'integer',
    float: 'number',
    boolean: 'boolean',
    date: 'string'
  },
  [PROVIDER_TYPES.ANTHROPIC]: {
    string: 'text',
    integer: 'number',
    float: 'number',
    boolean: 'boolean',
    date: 'string'
  }
};

/**
 * Represents a provider configuration
 */
class ProviderConfig {
  /**
   * @param {string} type - Provider type
   */
  constructor(type) {
    this.type = type;
    this.maxTokens = 2000;
    this.temperature = 0.7;
    this.systemPromptTemplate = this.getDefaultSystemPrompt();
    this.formatInstructions = this.getDefaultFormatInstructions();
  }

  getDefaultSystemPrompt() {
    switch (this.type) {
      case PROVIDER_TYPES.OPENAI:
        return 'You are an AI assistant trained by OpenAI to help with data extraction.';
      case PROVIDER_TYPES.ANTHROPIC:
        return 'You are Claude, an AI assistant created by Anthropic to help with data extraction.';
      default:
        return 'You are an AI assistant designed to help with data extraction.';
    }
  }

  getDefaultFormatInstructions() {
    switch (this.type) {
      case PROVIDER_TYPES.OPENAI:
        return 'Respond with a JSON object containing only the specified fields.';
      case PROVIDER_TYPES.ANTHROPIC:
        return 'Respond with a JSON object containing only the specified fields. Do not include any explanations or markdown formatting.';
      default:
        return 'Respond with the extracted data in the specified format.';
    }
  }

  getFieldFormat(type) {
    return TYPE_FORMATS[this.type]?.[type] || type;
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
  return new ProviderConfig(type);
}

module.exports = {
  PROVIDER_TYPES,
  createProviderConfig,
  ProviderConfig,
  DEFAULT_CONFIG,
  PROVIDER_CONFIGS
}; 