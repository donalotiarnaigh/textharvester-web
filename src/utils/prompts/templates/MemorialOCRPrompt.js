const BasePrompt = require('../BasePrompt');
const { MEMORIAL_FIELDS } = require('../types/memorialFields');
const { ProcessingError } = require('../../errorTypes');
const { standardizeNameParsing } = require('../../standardNameParser');
const { preprocessName } = require('../../nameProcessing');
const logger = require('../../logger');

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
- memorial_number: The memorial's unique numeric identifier (INTEGER) - extract ONLY the number, ignore any prefixes like "HG-", "M", "PLOT-"
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
- Memorial number MUST be an integer (whole number) - if you see "HG-18", extract 18; if you see "M123", extract 123
- IGNORE page numbers, fractions like "1/2", "2/3" - these are NOT memorial numbers
- Look for the actual memorial identifier number to the top right of the record page
- Extract only the year from death dates as INTEGER
- If any field cannot be determined, use null
- Preserve original spelling in the inscription text

TRANSCRIPTION NOTATION RULES:
- Use single dashes (-) for each illegible character/digit (e.g., "J---")
- Use pipes (|) for line breaks in the inscription, never newlines`;
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
   * Validate and convert OCR data
   * @param {Object} data - Raw OCR data
   * @returns {Object} - Validated and converted data
   */
  validateAndConvert(data) {
    logger.info('[MemorialOCRPrompt] Raw data input:', JSON.stringify(data, null, 2));

    // Handle null or undefined data
    if (!data) {
      throw new ProcessingError(
        'No data received from OCR processing - the sheet may be empty or unreadable',
        'empty_sheet'
      );
    }

    // Handle empty object
    if (Object.keys(data).length === 0) {
      throw new ProcessingError(
        'Empty data received from OCR processing - no text could be extracted from the sheet',
        'empty_sheet'
      );
    }

    // First check for required fields
    const requiredFields = this.fields.filter(field => field.required);
    for (const field of requiredFields) {
      const fieldValue = data[field.name];
      logger.info(`[MemorialOCRPrompt] Checking required field ${field.name}:`, fieldValue, typeof fieldValue);

      if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
        throw new ProcessingError(
          `${field.name} could not be found - please check if the field is present on the memorial`,
          'validation'
        );
      }
    }

    // Check if all fields are empty
    const allFieldsEmpty = this.fields.every(field => {
      const value = data[field.name];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (allFieldsEmpty) {
      throw new ProcessingError(
        'No readable text found on the sheet - please check if the sheet is empty or the image quality is sufficient',
        'empty_sheet'
      );
    }

    const result = {};

    // Process name fields first
    if (data.first_name || data.last_name) {
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ');
      const processedName = preprocessName(fullName);

      result.first_name = processedName.firstName || data.first_name;
      result.last_name = processedName.lastName || data.last_name;
    }

    // Process remaining fields
    for (const field of this.fields) {
      if (field.name !== 'first_name' && field.name !== 'last_name') {
        const value = data[field.name];
        logger.info(`[MemorialOCRPrompt] Processing field ${field.name}:`, value, typeof value);

        if (value !== undefined) {
          try {
            result[field.name] = this.validateField(field.name, value);
            logger.info(`[MemorialOCRPrompt] Validated ${field.name}:`, result[field.name]);
          } catch (error) {
            logger.error(`[MemorialOCRPrompt] Validation error for ${field.name}:`, error.message);
            throw error;
          }
        }
      }
    }

    logger.info('[MemorialOCRPrompt] Final result:', JSON.stringify(result, null, 2));
    return result;
  }
}

module.exports = MemorialOCRPrompt; 