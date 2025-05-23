const BasePrompt = require('../BasePrompt');
const { MEMORIAL_FIELDS } = require('../types/memorialFields');
const { ProcessingError } = require('../../errorTypes');
const { standardizeNameParsing } = require('../../standardNameParser');

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
    // Enhanced early validation for empty or invalid data
    if (!data || typeof data !== 'object') {
      throw new ProcessingError('No data received from OCR processing - the sheet may be empty or unreadable', 'empty_sheet');
    }

    if (Object.keys(data).length === 0) {
      throw new ProcessingError('Empty data received from OCR processing - no text could be extracted from the sheet', 'empty_sheet');
    }

    // Check if all fields are null/undefined/empty strings
    const allFieldsEmpty = Object.entries(this.fields).every(([fieldName]) => {
      const value = data[fieldName];
      return value === null || value === undefined || value === '';
    });

    if (allFieldsEmpty) {
      throw new ProcessingError('No readable text found on the sheet - please check if the sheet is empty or the image quality is sufficient', 'empty_sheet');
    }

    const result = {};
    const errors = [];
    
    // Step 1: Apply standardized name parsing with provider-specific options
    console.log('[NameProcessing] Raw data input:', {
      full_name: data.full_name,
      first_name: data.first_name,
      last_name: data.last_name,
      inscription: data.inscription?.substring(0, 50) + (data.inscription?.length > 50 ? '...' : '')
    });
    
    // Determine provider-specific options (if any)
    const providerOptions = {
      provider: this.config?.provider || 'default',
      preserveInitials: this.config?.provider === 'openai' // OpenAI tends to preserve initials better
    };
    
    // Apply the standardized name parsing
    const standardizedData = standardizeNameParsing(data, providerOptions);
    
    console.log('[NameProcessing] Standardized name data:', {
      first_name: standardizedData.first_name,
      last_name: standardizedData.last_name,
      prefix: standardizedData.prefix,
      suffix: standardizedData.suffix
    });
    
    // Copy standardized name fields into the data
    Object.assign(data, {
      first_name: standardizedData.first_name,
      last_name: standardizedData.last_name,
      prefix: standardizedData.prefix,
      suffix: standardizedData.suffix
    });

    // First pass: validate required fields are present
    // Check memorial_number first as it's the primary identifier
    if (this.fields.memorial_number.required && (data.memorial_number === null || data.memorial_number === undefined || data.memorial_number === '')) {
      throw new ProcessingError('Memorial number could not be found or read from the sheet', 'validation');
    }

    // Then check other required fields
    for (const [fieldName, field] of Object.entries(this.fields)) {
      if (fieldName === 'memorial_number') continue; // Already checked
      if (field.required && (data[fieldName] === null || data[fieldName] === undefined || data[fieldName] === '')) {
        errors.push(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`);
      }
    }

    if (errors.length > 0) {
      throw new ProcessingError(errors[0], 'validation');
    }

    // Second pass: validate and convert each field
    for (const [fieldName, field] of Object.entries(this.fields)) {
      try {
        const value = fieldName in data ? data[fieldName] : null;
        
        // Skip validation for null values in optional fields
        if (value === null && !field.required) {
          result[fieldName] = fieldName === 'first_name' ? '' : null; // Return empty string for first_name
          continue;
        }

        // Apply field-specific validation
        switch (fieldName) {
          case 'first_name':
          case 'last_name':
            if (value === null || value === '') {
              if (field.required) {
                throw new ProcessingError(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`, 'validation');
              }
              result[fieldName] = fieldName === 'first_name' ? '' : null;
            } else {
              // More flexible validation to accommodate international characters
              if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s\-'.]+$/.test(value)) {
                throw new ProcessingError(`Invalid name format for ${fieldName}: "${value}"`, 'validation');
              }
              // Names are already standardized, so just assign the value
              result[fieldName] = value;
            }
            break;

          case 'year_of_death':
            // Handle null value for year_of_death
            if (value === null) {
              result[fieldName] = null;
              break;
            }
            
            const year = parseInt(value, 10);
            if (isNaN(year)) {
              throw new ProcessingError(`Invalid year format: "${value}"`, 'validation');
            }
            if (year < 1500 || year > new Date().getFullYear()) {
              throw new ProcessingError(`Year_of_death must be between 1500 and ${new Date().getFullYear()}, got: ${year}`, 'validation');
            }
            result[fieldName] = year;
            break;

          default:
            // Safe transform for all other fields
            result[fieldName] = value === null ? null : field.transform(value);
        }
      } catch (error) {
        console.log(`[NameProcessing] Error processing ${fieldName}:`, error.message);
        // Preserve ProcessingError instances but wrap others
        if (error instanceof ProcessingError) {
          throw error;
        } else {
          throw new ProcessingError(error.message, 'validation');
        }
      }
    }

    // Copy additional fields that aren't part of the memorial fields
    // but preserve our name metadata (prefix, suffix)
    for (const [key, value] of Object.entries(data)) {
      if (!(key in this.fields) || key === 'prefix' || key === 'suffix') {
        result[key] = value;
      }
    }
    
    console.log('[NameProcessing] Final processed data:', {
      memorial_number: result.memorial_number,
      first_name: result.first_name,
      last_name: result.last_name,
      prefix: result.prefix,
      suffix: result.suffix
    });

    return result;
  }
}

module.exports = MemorialOCRPrompt; 