const BasePrompt = require('../BasePrompt');

/**
 * Prompt template for burial register extraction
 * @extends BasePrompt
 */
class BurialRegisterPrompt extends BasePrompt {
  /**
   * Create a new burial register prompt
   * @param {Object} config Configuration options
   */
  constructor(config = {}) {
    super({
      version: '1.0.0',
      description: 'Prompt template for extracting burial register data',
      providers: ['openai', 'anthropic'],
      ...config
    });
  }
}

module.exports = BurialRegisterPrompt;
