const BasePrompt = require('../BasePrompt');
const { MEMORIAL_FIELDS } = require('../types/memorialFields');

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
      fields: MEMORIAL_FIELDS,
      providers: ['openai', 'anthropic'],
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
- memorial_number: The memorial's identifier (STRING)
- first_name: The first person's first name (STRING, UPPERCASE)
- last_name: The first person's last name (STRING, UPPERCASE)
- year_of_death: The first person's year of death only (INTEGER)
- inscription: The complete inscription text (STRING)

Example of EXACT JSON format required:

{
  "memorial_number": "HG-18",
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
   * Get provider-specific prompt configuration
   * @param {string} provider Provider name
   * @returns {Object} Provider-specific prompt configuration
   */
  getProviderPrompt(provider) {
    this.validateProvider(provider);
    const basePrompt = this.getPromptText();

    switch (provider.toLowerCase()) {
      case 'openai':
        return {
          systemPrompt: 'You are an expert OCR system trained by OpenAI, specializing in heritage and genealogical data extraction.',
          userPrompt: `${basePrompt}\n\nResponse Format:\n- Use response_format: { type: "json" }\n- All numeric values (year_of_death) MUST be actual integers\n- All text fields must be properly formatted strings`
        };

      case 'anthropic':
        return {
          systemPrompt: 'You are Claude, an expert OCR system trained by Anthropic, specializing in heritage and genealogical data extraction.',
          userPrompt: `${basePrompt}\n\nResponse Format:\n- Return valid JSON only\n- All numeric values (year_of_death) MUST be actual integers\n- All text fields must be properly formatted strings\n- Ensure strict adherence to field formats`
        };

      default:
        return { userPrompt: basePrompt };
    }
  }

  /**
   * Validate and convert memorial data
   * @param {Object} data Data to validate
   * @returns {Object} Validated and converted data
   */
  validateAndConvert(data) {
    const result = {};
    const errors = [];

    // First pass: validate required fields are present
    for (const [fieldName, field] of Object.entries(this.fields)) {
      if (field.required && !(fieldName in data)) {
        errors.push(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`);
      }
    }

    if (errors.length > 0) {
      throw new Error(errors[0]);
    }

    // Second pass: validate and convert each field
    for (const [fieldName, field] of Object.entries(this.fields)) {
      try {
        const value = fieldName in data ? data[fieldName] : null;
        
        // Skip validation for null values in optional fields
        if (value === null && !field.required) {
          result[fieldName] = null;
          continue;
        }

        // Apply field-specific validation
        switch (fieldName) {
          case 'first_name':
          case 'last_name':
            if (value && !/^[A-Za-z\s\-']+$/.test(value)) {
              throw new Error(`Invalid name format for ${fieldName}`);
            }
            result[fieldName] = field.transform(value);
            break;

          case 'year_of_death':
            // Handle null value for year_of_death
            if (value === null) {
              result[fieldName] = null;
              break;
            }
            
            const year = parseInt(value, 10);
            if (isNaN(year)) {
              throw new Error('Invalid year format');
            }
            if (year < 1500 || year > new Date().getFullYear()) {
              throw new Error(`Year_of_death must be between 1500 and ${new Date().getFullYear()}`);
            }
            result[fieldName] = year;
            break;

          default:
            result[fieldName] = field.transform(value);
        }
      } catch (error) {
        throw new Error(error.message);
      }
    }

    // Copy additional fields that aren't part of the memorial fields
    for (const [key, value] of Object.entries(data)) {
      if (!(key in this.fields)) {
        result[key] = value;
      }
    }

    return result;
  }
}

module.exports = MemorialOCRPrompt; 