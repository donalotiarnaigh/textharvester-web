const OpenAI = require('openai');
const BaseVisionProvider = require('./baseProvider');

/**
 * OpenAI-specific implementation for vision models
 */
class OpenAIProvider extends BaseVisionProvider {
  constructor(config) {
    super(config);
    this.client = new OpenAI(config.OPENAI_API_KEY || process.env.OPENAI_API_KEY);
    this.model = config.OPENAI_MODEL || 'gpt-4o';
  }

  /**
   * Process an image using OpenAI's vision capabilities
   * @param {string} base64Image - Base64 encoded image
   * @param {string} prompt - The prompt to send to the model
   * @returns {Promise<Object>} - Parsed JSON response
   */
  async processImage(base64Image, prompt) {
    const requestPayload = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'Return a JSON object with the extracted text details.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
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
      max_tokens: 3000,
    };

    try {
      const result = await this.client.chat.completions.create(requestPayload);
      return JSON.parse(result.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI processing failed: ${error.message}`);
    }
  }
}

module.exports = OpenAIProvider; 