require('@anthropic-ai/sdk/shims/node');
const Anthropic = require('@anthropic-ai/sdk');
const BaseVisionProvider = require('./baseProvider');
const { promptManager } = require('../prompts/templates/providerTemplates');

/**
 * Anthropic-specific implementation for vision models
 * Handles integration with the prompt modularization system
 */
class AnthropicProvider extends BaseVisionProvider {
  constructor(config) {
    super(config);
    this.client = new Anthropic({
      apiKey: this.config.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
    });
    this.model = this.config.ANTHROPIC_MODEL || this.config.anthropic?.model || 'claude-4-sonnet-20250514';
    this.maxTokens = this.config.MAX_TOKENS || this.config.anthropic?.maxTokens || 4000;
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
   * Process an image using Anthropic Claude's vision capabilities
   * @param {string} base64Image - Base64 encoded image
   * @param {string|Object} prompt - The prompt to send to the model
   * @param {Object} options - Additional options for processing
   * @param {boolean} options.raw - Whether to return raw response without JSON parsing
   * @param {BasePrompt} options.promptTemplate - Optional prompt template to use
   * @returns {Promise<Object>} - Parsed JSON response
   */
  async processImage(base64Image, prompt, options = {}) {
    try {
      // Format prompt if template is provided
      let systemPrompt = options.systemPrompt || 'Return a JSON object with the extracted text details.';
      let userPrompt = '';

      // Handle different prompt formats
      if (typeof prompt === 'string') {
        userPrompt = prompt;
      } else if (prompt && typeof prompt === 'object') {
        systemPrompt = prompt.systemPrompt || systemPrompt;
        userPrompt = prompt.userPrompt || '';
      }

      if (options.promptTemplate) {
        const formatted = promptManager.formatPrompt(options.promptTemplate, 'anthropic');
        systemPrompt = formatted.systemPrompt;
        userPrompt = formatted.prompt;
      }

      // Ensure userPrompt is a valid string
      if (typeof userPrompt !== 'string') {
        userPrompt = JSON.stringify(userPrompt);
      }

      const result = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { 
                type: 'image', 
                source: { 
                  type: 'base64', 
                  media_type: 'image/jpeg', 
                  data: base64Image 
                } 
              }
            ]
          }
        ]
      });

      // Extract the text content from the response
      const content = result.content.find(item => item.type === 'text')?.text;
      
      if (!content) {
        throw new Error('No text content in response');
      }

      // Return raw content if requested
      if (options.raw) {
        return content;
      }

      // Parse the JSON response, handling the case where it's wrapped in a code block
      let jsonContent = content;
      
      // Check if the content is wrapped in a code block (```json ... ```)
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
      }
      
      try {
        return JSON.parse(jsonContent);
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError, 'Content:', jsonContent);
        throw new Error(`Failed to parse JSON response: ${jsonError.message}`);
      }
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(`Anthropic processing failed: ${error.message}`);
    }
  }

  /**
   * Validate provider-specific configuration
   * @returns {boolean} True if configuration is valid
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    if (!this.client) {
      throw new Error('Anthropic client not initialized. Check API key configuration.');
    }
    if (!this.model.includes('sonnet') && !this.model.includes('haiku') && !this.model.includes('claude-4')) {
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
    return promptManager.validatePrompt(promptTemplate, 'anthropic');
  }
}

module.exports = AnthropicProvider; 