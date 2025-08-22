require('openai/shims/node');
const OpenAI = require('openai');
const BaseVisionProvider = require('./baseProvider');
const { promptManager } = require('../prompts/templates/providerTemplates');

/**
 * OpenAI-specific implementation for vision models
 * Handles integration with the prompt modularization system
 */
class OpenAIProvider extends BaseVisionProvider {
  constructor(config) {
    super(config);
    this.client = new OpenAI({
      apiKey: this.config.OPENAI_API_KEY || process.env.OPENAI_API_KEY
    });
    this.model = this.config.OPENAI_MODEL || this.config.openAI?.model || 'gpt-5';
    this.maxTokens = this.config.MAX_TOKENS || this.config.openAI?.maxTokens || 4000;
    this.temperature = this.config.TEMPERATURE || 0;
  }

  /**
   * Get the current model version
   * @returns {string} The model version
   */
  getModelVersion() {
    return this.model;
  }

  /**
   * Process an image using OpenAI's vision capabilities
   * @param {string} base64Image - Base64 encoded image
   * @param {string} prompt - The prompt to send to the model
   * @param {Object} options - Additional options for processing
   * @param {boolean} options.raw - Whether to return raw response without JSON parsing
   * @param {BasePrompt} options.promptTemplate - Optional prompt template to use
   * @returns {Promise<Object>} - Parsed JSON response
   */
  async processImage(base64Image, prompt, options = {}) {
    try {
      // Format prompt if template is provided
      let systemPrompt = options.systemPrompt || 'Return a JSON object with the extracted text details.';
      let userPrompt = prompt;

      if (options.promptTemplate) {
        const formatted = promptManager.formatPrompt(options.promptTemplate, 'openai');
        systemPrompt = formatted.systemPrompt;
        userPrompt = formatted.prompt;
      }

      const requestPayload = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: this.maxTokens
      };

      // GPT-5 only supports default temperature (1), so don't include it
      if (!this.model.includes('gpt-5')) {
        requestPayload.temperature = this.temperature;
      }

      const result = await this.client.chat.completions.create(requestPayload);
      const content = result.choices[0].message.content;
      
      // Return raw content if requested
      if (options.raw) {
        return content;
      }

      try {
        return JSON.parse(content);
      } catch (parseError) {
        throw new Error(`OpenAI processing failed: ${parseError.message}`);
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI processing failed: ${error.message}`);
    }
  }

  /**
   * Validate provider-specific configuration
   * @returns {boolean} True if configuration is valid
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Check API key configuration.');
    }
    if (!this.model.includes('vision') && !this.model.includes('gpt-5') && !this.model.includes('gpt-4o')) {
      throw new Error('Invalid model specified. Must be a vision-capable model.');
    }
    return true;
  }

  /**
   * Validate a prompt template for use with this provider
   * @param {BasePrompt} promptTemplate The prompt template to validate
   * @returns {Object} Validation result
   */
  validatePromptTemplate(promptTemplate) {
    return promptManager.validatePrompt(promptTemplate, 'openai');
  }
}

module.exports = OpenAIProvider; 