const BasePrompt = require('../BasePrompt');
const { memorialTypes } = require('../types/memorialTypes');

/**
 * Standard OCR prompt for memorial inscriptions
 * @extends BasePrompt
 */
class MemorialOCRPrompt extends BasePrompt {
  /**
   * Create a new memorial OCR prompt
   * @param {Object} config Configuration options
   */
  constructor(config = {}) {
    super({
      version: '2.0.0',
      description: 'Standard OCR prompt for extracting memorial inscription data with strict type validation',
      typeDefinitions: memorialTypes,
      ...config
    });
  }

  /**
   * Get the complete prompt text with type information
   * @returns {string} Formatted prompt text
   */
  getPromptText() {
    return `You're an expert in OCR and are working in a heritage/genealogy context assisting in data processing post graveyard survey.

Examine this image and extract the following data with specific types:
- memorial_number: INTEGER (must be a number, not text)
- first_name: STRING
- last_name: STRING
- year_of_death: INTEGER (must be between 1500 and 2100, must be a number not text)
- inscription: STRING

IMPORTANT:
- All numeric values MUST be actual numbers, not strings
- The year_of_death MUST be a number between 1500 and 2100
- Use null for any fields that cannot be determined
- Names should be in UPPERCASE

Respond in JSON format only with these exact field names. Example:
{
  "memorial_number": 69,
  "first_name": "THOMAS",
  "last_name": "RUANE",
  "year_of_death": 1923,
  "inscription": "SACRED HEART OF JESUS HAVE MERCY ON THE SOUL OF THOMAS RUANE LISNAGROOBE WHO DIED APRIL 16th 1923 AGED 74 YRS"
}

If any field is not visible or cannot be determined, use null. For example:
{
  "memorial_number": null,
  "first_name": "JOHN",
  "last_name": "SMITH",
  "year_of_death": null,
  "inscription": "Inscription text here..."
}`;
  }

  /**
   * Get a prompt variation for a specific provider
   * @param {string} provider - AI provider name
   * @returns {string} Provider-specific prompt
   */
  getProviderPrompt(provider) {
    const basePrompt = this.getPromptText();
    
    if (provider.toLowerCase() === 'anthropic') {
      return basePrompt + '\n\nRemember: All numeric values (memorial_number, year_of_death) MUST be actual integers, not strings. Years must be between 1500 and 2100.';
    }
    
    if (provider.toLowerCase() === 'openai') {
      return basePrompt + '\n\nUse response_format: { type: "json_object" }';
    }
    
    return basePrompt;
  }
}

module.exports = MemorialOCRPrompt; 