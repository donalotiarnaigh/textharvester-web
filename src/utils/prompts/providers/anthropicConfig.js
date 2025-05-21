const { ProviderConfig, PROVIDER_TYPES } = require('./providerConfig');

/**
 * Anthropic-specific provider configuration
 */
class AnthropicConfig extends ProviderConfig {
  /**
   * @param {Object} config - Anthropic configuration
   * @param {string} [config.model='claude-3-sonnet-20240229'] - Anthropic model name
   * @param {Object} [config.responseFormat] - Response format configuration
   */
  constructor(config = {}) {
    super({
      name: 'anthropic',
      type: PROVIDER_TYPES.ANTHROPIC,
      ...config
    });

    this.model = config.model || 'claude-3-sonnet-20240229';
    this.validateModel();
  }

  /**
   * Validate Anthropic model configuration
   * @private
   */
  validateModel() {
    const supportedModels = [
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229'
    ];

    if (!supportedModels.includes(this.model)) {
      throw new Error(`Unsupported Anthropic model: ${this.model}`);
    }
  }

  /**
   * Get Anthropic-specific API parameters
   * @returns {Object} API parameters
   */
  getApiParams() {
    return {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: [] // Will be populated by the provider
    };
  }

  /**
   * Format system prompt for Anthropic
   * @param {Object} params - Parameters for formatting
   * @param {string} params.task - Task description
   * @returns {string} Formatted system prompt
   */
  formatSystemPrompt(params) {
    const basePrompt = super.formatSystemPrompt(params);
    return `${basePrompt}\n\nPlease format your response as a JSON object. Do not include any explanations or markdown formatting.`;
  }
}

module.exports = AnthropicConfig; 