const { ProviderConfig, PROVIDER_TYPES } = require('./providerConfig');

/**
 * OpenAI-specific provider configuration
 */
class OpenAIConfig extends ProviderConfig {
  /**
   * @param {Object} config - OpenAI configuration
   * @param {string} [config.model='gpt-4-vision-preview'] - OpenAI model name
   * @param {Object} [config.responseFormat] - Response format configuration
   */
  constructor(config = {}) {
    super({
      name: 'openai',
      type: PROVIDER_TYPES.OPENAI,
      ...config
    });

    this.model = config.model || 'gpt-4-vision-preview';
    this.validateModel();
  }

  /**
   * Validate OpenAI model configuration
   * @private
   */
  validateModel() {
    const supportedModels = [
      'gpt-4-vision-preview',
      'gpt-4-1106-vision-preview'
    ];

    if (!supportedModels.includes(this.model)) {
      throw new Error(`Unsupported OpenAI model: ${this.model}`);
    }
  }

  /**
   * Get OpenAI-specific API parameters
   * @returns {Object} API parameters
   */
  getApiParams() {
    return {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      response_format: { type: 'json' }
    };
  }
}

module.exports = OpenAIConfig; 