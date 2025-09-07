const BasePrompt = require('../BasePrompt');
const { MEMORIAL_FIELDS, MemorialField } = require('../types/memorialFields');
const { StringType } = require('../types/dataTypes');
const { ProcessingError } = require('../../errorTypes');
const { standardizeNameParsing } = require('../../standardNameParser');
const { preprocessName } = require('../../nameProcessing');
const logger = require('../../logger');

/**
 * Monument Photo OCR prompt for extracting memorial data from monument/headstone photos
 * @extends BasePrompt
 */
class MonumentPhotoOCRPrompt extends BasePrompt {
  /**
   * Create a new monument photo OCR prompt
   * @param {Object} config Configuration options
   */
  constructor(config = {}) {
    super({
      version: '1.0.0',
      description: 'OCR prompt for extracting memorial data from monument photos with weathered stone considerations',
      fields: MEMORIAL_FIELDS,
      providers: ['openai', 'anthropic'],
      ...config
    });
  }

  /**
   * Get the complete prompt text with monument-specific instructions
   * @returns {string} Formatted prompt text
   */
  getPromptText() {
    return `You're an expert in OCR specializing in reading weathered stone monuments, headstones, and gravestones in a heritage/genealogy context.

Your task is to extract specific fields from monument photos and return them in JSON format.

MONUMENT-SPECIFIC CHALLENGES:
- Text may be carved in stone and weathered over time
- Letters may be partially obscured or damaged
- Text may be at angles due to photo perspective
- Stone may have moss, dirt, or weathering affecting readability
- Multiple names/dates may be present on the same monument
- Decorative elements (crosses, flowers, symbols) may be present

CRITICAL: Return ONLY these 5 fields in JSON format, nothing more:
- memorial_number: Set to null (the system will assign this from the filename)
- first_name: The first person's first name (STRING, UPPERCASE)
- last_name: The first person's last name (STRING, UPPERCASE) 
- year_of_death: The first person's year of death only (INTEGER)
- inscription: The complete inscription text (STRING)

MONUMENT READING GUIDELINES:
- Focus on the primary/first person mentioned if multiple people are listed
- If text is partially weathered, use [?] to indicate uncertain characters
- If completely unreadable sections exist, use [...] or [WEATHERED]
- Include decorative symbols if clearly visible (✝, †, 🕊, etc.)
- Preserve line breaks in inscriptions using \\n

Example of EXACT JSON format required:

{
  "memorial_number": null,
  "first_name": "MICHEAL", 
  "last_name": "RUANE",
  "year_of_death": 1959,
  "inscription": "SACRED TO THE MEMORY OF\\nMICHEAL RUANE\\nWHO DEPARTED THIS LIFE\\nFEB. 2ND 1959\\nAGED 92 YEARS\\nR.I.P."
}

IMPORTANT VALIDATION RULES:
- memorial_number: Always set to null (system will assign from filename)
- first_name/last_name: Must be UPPERCASE strings
- year_of_death: Must be integer between 1500-2030, not string
- inscription: Complete text as it appears on the monument
- Use null for any field that cannot be determined

Handle weathered or damaged monuments with care - it's better to use null or indicate uncertainty than to guess.`;
  }

  /**
   * Get provider-specific prompt formatting
   * @param {string} provider The AI provider (openai, anthropic)
   * @returns {Object|string} Provider-specific prompt format
   */
  getProviderPrompt(provider) {
    const basePrompt = this.getPromptText();
    
    if (provider === 'openai') {
      return {
        systemPrompt: `You are an expert OCR system specializing in reading weathered stone monuments and headstones. You excel at extracting structured data from monument photos, handling challenges like weathered stone, carved text at angles, and partially obscured inscriptions. Focus on accuracy and indicate uncertainty when text is unclear.`,
        userPrompt: basePrompt + "\n\nExtract the memorial data as JSON with these exact fields: memorial_number, first_name, last_name, year_of_death, inscription"
      };
    } else if (provider === 'anthropic') {
      return {
        systemPrompt: `You are Claude, an expert OCR system trained by Anthropic, specializing in reading weathered stone monuments and headstones. You excel at extracting structured data from monument photos, handling challenges like weathered stone, carved text at angles, and partially obscured inscriptions. Focus on accuracy and indicate uncertainty when text is unclear.`,
        userPrompt: `${basePrompt}\n\nResponse Format:\n- Return valid JSON only\n- All numeric values (year_of_death) MUST be actual integers\n- All text fields must be properly formatted strings\n- Ensure strict adherence to field formats\n- Do not include any explanatory text, only return the JSON object`
      };
    }
    
    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Validate and convert monument photo OCR data with enhanced processing
   * @param {Object} rawData Raw data from OCR processing
   * @returns {Object} Validated and converted data
   */
  validateAndConvert(rawData) {
    logger.info(`[MonumentPhotoOCRPrompt] Raw data input: ${JSON.stringify(rawData, null, 2)}`);

    if (!rawData || typeof rawData !== 'object') {
      throw new ProcessingError('Invalid monument OCR data: expected object', 'validation_error');
    }

    // Check if all fields are empty (monument-specific empty check)
    const allFieldsEmpty = this.fields.every(field => {
      const value = rawData[field.name];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (allFieldsEmpty) {
      throw new ProcessingError(
        'No readable text found on the monument - please check if the monument is weathered or the image quality is sufficient',
        'empty_monument'
      );
    }

    const result = {};

    // Process name fields first with monument-specific handling
    if (rawData.first_name || rawData.last_name) {
      const fullName = [rawData.first_name, rawData.last_name].filter(Boolean).join(' ');
      const processedName = preprocessName(fullName);
      
      result.first_name = processedName.firstName || rawData.first_name;
      result.last_name = processedName.lastName || rawData.last_name;
    }

    // Process remaining fields using array-based field definitions
    for (const field of this.fields) {
      if (field.name !== 'first_name' && field.name !== 'last_name') {
        const value = rawData[field.name];
        logger.info(`[MonumentPhotoOCRPrompt] Processing field ${field.name}:`, value, typeof value);
        
        if (value !== undefined) {
          try {
            result[field.name] = this.validateField(field.name, value);
            logger.info(`[MonumentPhotoOCRPrompt] Validated ${field.name}:`, result[field.name]);
          } catch (error) {
            logger.error(`[MonumentPhotoOCRPrompt] Validation error for ${field.name}:`, error.message);
            throw error;
          }
        }
      }
    }

    // Additional monument-specific processing
    if (result.inscription) {
      result.inscription = this.processMonumentInscription(result.inscription);
    }

    logger.info(`[MonumentPhotoOCRPrompt] Final result: ${JSON.stringify(result, null, 2)}`);
    return result;
  }

  /**
   * Process monument inscription text with monument-specific considerations
   * @param {string} inscription Raw inscription text
   * @returns {string} Processed inscription text
   */
  processMonumentInscription(inscription) {
    if (!inscription || typeof inscription !== 'string') {
      return inscription;
    }

    // Preserve monument-specific elements
    let processed = inscription;

    // Normalize common monument abbreviations while preserving original formatting
    // Note: We preserve the original text but could add normalization here if needed
    
    return processed;
  }
}

module.exports = MonumentPhotoOCRPrompt;
