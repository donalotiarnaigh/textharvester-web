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
      version: '1.0.0',
      description: 'Standard OCR prompt for extracting memorial inscription data',
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
- memorial_number: INTEGER
- first_name: STRING
- last_name: STRING
- year_of_death: INTEGER
- inscription: STRING

Respond in JSON format only with these exact field names. Example:
{
  "memorial_number": 69,
  "first_name": "THOMAS",
  "last_name": "RUANE",
  "year_of_death": 1923,
  "inscription": "SACRED HEART OF JESUS HAVE MERCY ON THE SOUL OF THOMAS RUANE LISNAGROOBE WHO DIED APRIL 16th 1923 AGED 74 YRS AND OF HIS WIFE MARGARET RUANE DIED JULY 26th 1929 AGED 78 YEARS R. I. P. ERECTED BY THEIR FOND SON THOMAS RUANE PHILADELPHIA USA"
}

If any field is not visible or cannot be determined, use null. For example:
{
  "memorial_number": 42,
  "first_name": "JOHN",
  "last_name": "SMITH",
  "year_of_death": null,
  "inscription": "Inscription text here..."
}`;
  }

  /**
   * Get a prompt variation for a specific provider
   * @param {string} provider AI provider name
   * @returns {string} Provider-specific prompt
   */
  getProviderPrompt(provider) {
    const basePrompt = this.getPromptText();
    
    switch (provider.toLowerCase()) {
      case 'openai':
        return `${basePrompt}\n\nNote: This response will be parsed as JSON with response_format: { type: "json_object" }`;
      
      case 'anthropic':
        return `${basePrompt}\n\nEnsure years are extracted as numbers, not text. If a year appears as text (e.g., "nineteen twenty-three"), convert it to a numeric value.`;
      
      default:
        return basePrompt;
    }
  }
}

module.exports = MemorialOCRPrompt; 