require('@anthropic-ai/sdk/shims/node');
const Anthropic = require('@anthropic-ai/sdk');
const BaseVisionProvider = require('./baseProvider');
const { promptManager } = require('../prompts/templates/providerTemplates');
const PerformanceTracker = require('../performanceTracker');
const logger = require('../logger');

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
        // Use the new prompt template system
        const formatted = options.promptTemplate.getProviderPrompt('anthropic');
        systemPrompt = formatted.systemPrompt || systemPrompt;
        userPrompt = formatted.userPrompt || formatted;
      }

      // Ensure userPrompt is a valid string
      if (typeof userPrompt !== 'string') {
        userPrompt = JSON.stringify(userPrompt);
      }

      // Track API performance
      const result = await PerformanceTracker.trackAPICall(
        'anthropic',
        this.model,
        'processImage',
        async () => {
          return await this.client.messages.create({
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
        },
        {
          imageSize: base64Image ? Math.round(base64Image.length * 0.75) : 0, // Approximate bytes
          promptLength: userPrompt ? userPrompt.length : 0,
          systemPromptLength: systemPrompt ? systemPrompt.length : 0,
          maxTokens: this.maxTokens,
          temperature: this.temperature
        }
      );

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
        logger.error(`Anthropic JSON parsing failed for model ${this.model}`, jsonError, {
          phase: 'response_parsing',
          operation: 'processImage',
          contentPreview: jsonContent.substring(0, 200)
        });
        logger.debugPayload('Anthropic JSON parsing error details:', {
          model: this.model,
          jsonContent: jsonContent,
          error: jsonError.message
        });
        throw new Error(`Failed to parse JSON response: ${jsonError.message}`);
      }
    } catch (error) {
      logger.error(`Anthropic API error for model ${this.model}`, error, {
        phase: 'api_call',
        operation: 'processImage'
      });
      logger.debugPayload('Anthropic API error details:', {
        model: this.model,
        error: error.message,
        stack: error.stack
      });
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