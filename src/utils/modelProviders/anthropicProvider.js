import Anthropic from '@anthropic-ai/sdk';
import logger from '../logger.js';

/**
 * Anthropic-specific implementation for vision models
 */
export class AnthropicProvider {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Process an image using Anthropic Claude's vision capabilities
   * @param {string} base64Image - Base64 encoded image
   * @returns {Promise<Object>} - Parsed JSON response
   */
  async processImage(base64Image) {
    try {
      logger.info('Processing image with Anthropic');

      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'You\'re an expert in OCR and are working in a heritage/genealogy context assisting in data processing post graveyard survey. Examine this image and extract the text as per the following details for each memorial: memorial number, first name, last name, year of death, and the inscription text. Respond in JSON format only, adhering to the order mentioned. e.g., {"memorial_number": "69", "first_name": "THOMAS", "last_name": "RUANE", "year_of_death": "1923", "inscription": "SACRED HEART OF JESUS HAVE MERCY ON THE SOUL OF THOMAS RUANE LISNAGROOBE WHO DIED APRIL 16th 1923 AGED 74 YRS AND OF HIS WIFE MARGARET RUANE DIED JULY 26th 1929 AGED 78 YEARS R. I. P. ERECTED BY THEIR FOND SON THOMAS RUANE PHILADELPHIA USA"}. If a memorial number, first name, last name, or year of death is not visible or the inscription is not present, return a JSON with NULL for the missing fields.'
              },
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
        max_tokens: 1000
      });

      const result = JSON.parse(response.content[0].text);
      logger.info('Anthropic processing complete');
      return result;
    } catch (error) {
      logger.error('Anthropic API error:', error);
      throw new Error(`Anthropic processing failed: ${error.message}`);
    }
  }
}

module.exports = AnthropicProvider; 