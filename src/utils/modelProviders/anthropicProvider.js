const Anthropic = require('@anthropic-ai/sdk');
const BaseVisionProvider = require('./baseProvider');

/**
 * Anthropic-specific implementation for vision models
 */
class AnthropicProvider extends BaseVisionProvider {
  constructor(config) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
    });
    // Default to Claude 3.7 Sonnet which is comparable to GPT-4o
    this.model = config.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229';
  }

  /**
   * Process an image using Anthropic Claude's vision capabilities
   * @param {string} base64Image - Base64 encoded image
   * @param {string} prompt - The prompt to send to the model
   * @returns {Promise<Object>} - Parsed JSON response
   */
  async processImage(base64Image, prompt) {
    try {
      const result = await this.client.messages.create({
        model: this.model,
        max_tokens: 3000,
        system: 'Return a JSON object with the extracted text details.',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
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
        ],
      });

      // Extract the text content from the response
      const content = result.content.find(item => item.type === 'text')?.text;
      
      if (!content) {
        throw new Error('No text content in response');
      }

      // Parse the JSON response
      return JSON.parse(content);
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(`Anthropic processing failed: ${error.message}`);
    }
  }
}

module.exports = AnthropicProvider; 