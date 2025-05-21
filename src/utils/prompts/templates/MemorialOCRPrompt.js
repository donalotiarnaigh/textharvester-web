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
      description: 'Standard OCR prompt for extracting basic memorial inscription data with type validation',
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

Your task is to extract specific fields and return them in JSON format.

CRITICAL: Return ONLY these 5 fields in JSON format, nothing more:
- memorial_number: The memorial's identifier (INTEGER)
- first_name: The first person's first name (STRING, UPPERCASE)
- last_name: The first person's last name (STRING, UPPERCASE)
- year_of_death: The first person's year of death only (INTEGER)
- inscription: The complete inscription text (STRING)

Example of EXACT JSON format required:

{
  "memorial_number": 18,
  "first_name": "MICHEAL",
  "last_name": "RUANE",
  "year_of_death": 1959,
  "inscription": "IN MEMORY OF MICHEAL RUANE DIED 2. FEB. 1959 AGED 92 YEARS MARY THERESA RUANE DIED 8 FEB. 1945 AGED 3 YEARS THOMAS JOSEPH RUANE DIED 24 MARCH 1948 AGED 9 DAYS JAMES GARETH RUANE (INFANT) AUGUST 1953"
}

IMPORTANT RULES:
- Return ONLY these 5 fields in JSON format - NO NESTED OBJECTS, NO ADDITIONAL FIELDS
- Even if the image is a structured form or sheet, DO NOT reproduce that structure
- Do not include 'document_type', 'graveyard_info', or any other metadata
- For multiple people, use ONLY the first person mentioned
- Names must be in UPPERCASE
- Preserve memorial numbers exactly as written
- Extract only the year from death dates as INTEGER
- If any field cannot be determined, use null
- Preserve original spelling in the inscription text`;
  }

  /**
   * Get a prompt variation for a specific provider
   * @param {string} provider - AI provider name
   * @returns {string} Provider-specific prompt
   */
  getProviderPrompt(provider) {
    const basePrompt = this.getPromptText();
    
    if (provider.toLowerCase() === 'anthropic') {
      return basePrompt + '\n\nCRITICAL: Your response must contain ONLY the 5 specified fields in JSON format. All numeric values (memorial_number, year_of_death) MUST be actual integers.';
    }
    
    if (provider.toLowerCase() === 'openai') {
      return basePrompt + '\n\nUse response_format: { type: "json_object" } with ONLY the 5 specified fields in JSON format.';
    }
    
    return basePrompt;
  }

  /**
   * Validates and converts data types according to schema
   * @param {Object} data - The data object to validate
   * @returns {Object} - The validated and converted data object
   */
  validateAndConvert(data) {
    // Start with metadata fields
    const result = {
      memorial_number: null,
      first_name: null,
      last_name: null,
      year_of_death: null,
      inscription: null,
      ai_provider: data.ai_provider || null,
      file_name: data.file_name || null,
      model_version: data.model_version || null,
      prompt_template: data.prompt_template || null,
      prompt_version: data.prompt_version || null
    };

    // Convert numeric fields
    if (data.memorial_number) {
      const num = parseInt(data.memorial_number, 10);
      result.memorial_number = !isNaN(num) ? num : null;
    }

    if (data.year_of_death) {
      const year = parseInt(data.year_of_death, 10);
      result.year_of_death = (!isNaN(year) && year >= 1500 && year <= new Date().getFullYear()) ? year : null;
    }

    // Handle string fields
    if (data.first_name) {
      result.first_name = String(data.first_name).toUpperCase();
    }

    if (data.last_name) {
      result.last_name = String(data.last_name).toUpperCase();
    }

    if (data.inscription) {
      result.inscription = String(data.inscription);
    }

    return result;
  }
}

module.exports = MemorialOCRPrompt; 