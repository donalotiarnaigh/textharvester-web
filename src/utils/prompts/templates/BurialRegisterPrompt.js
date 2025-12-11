const BasePrompt = require('../BasePrompt');
const { StringType, IntegerType, validateValue } = require('../types/dataTypes');

const PAGE_FIELDS = {
  volume_id: {
    type: new StringType(),
    description: 'Volume identifier for the burial register',
    metadata: { required: true, format: 'identifier', maxLength: 50 }
  },
  page_number: {
    type: new IntegerType(),
    description: 'Sequential page number within the volume',
    metadata: {}
  },
  parish_header_raw: {
    type: new StringType(),
    description: 'Parish name as it appears in the page header',
    metadata: { maxLength: 200 }
  },
  county_header_raw: {
    type: new StringType(),
    description: 'County name from the page header',
    metadata: { maxLength: 200 }
  },
  year_header_raw: {
    type: new StringType(),
    description: 'Year indicated in the page header',
    metadata: { maxLength: 50 }
  },
  page_marginalia_raw: {
    type: new StringType(),
    description: 'Any marginalia or notes that apply to the whole page',
    metadata: { maxLength: 1000 }
  }
};

const ENTRY_FIELDS = {
  row_index_on_page: {
    type: new IntegerType(),
    description: 'Row index of the entry on the page, starting from 1',
    metadata: { required: true, min: 1 }
  },
  entry_id: {
    type: new StringType(),
    description: 'Generated entry identifier formatted as {volume_id}_p{page_number}_r{row_index}'
  },
  entry_no_raw: {
    type: new StringType(),
    description: 'Entry number exactly as written on the register page',
    metadata: { maxLength: 50 }
  },
  name_raw: {
    type: new StringType(),
    description: 'Full name as written in the register entry',
    metadata: { maxLength: 300 }
  },
  abode_raw: {
    type: new StringType(),
    description: 'Place of residence as written in the entry',
    metadata: { maxLength: 300 }
  },
  burial_date_raw: {
    type: new StringType(),
    description: 'Burial date as written, including any partial or uncertain values',
    metadata: { maxLength: 100 }
  },
  age_raw: {
    type: new StringType(),
    description: 'Age at death as written in the entry',
    metadata: { maxLength: 50 }
  },
  officiant_raw: {
    type: new StringType(),
    description: 'Name or title of officiant as written',
    metadata: { maxLength: 200 }
  },
  marginalia_raw: {
    type: new StringType(),
    description: 'Entry-level marginalia or notes',
    metadata: { maxLength: 1000 }
  },
  extra_notes_raw: {
    type: new StringType(),
    description: 'Any additional notes for this entry',
    metadata: { maxLength: 1000 }
  },
  row_ocr_raw: {
    type: new StringType(),
    description: 'Raw OCR text for the entire entry row',
    metadata: { maxLength: 2000 }
  },
  uncertainty_flags: {
    type: new StringType(),
    description: 'List of uncertainty flags for this entry (array of strings)'
  }
};

/**
 * Prompt template for burial register extraction
 * @extends BasePrompt
 */
class BurialRegisterPrompt extends BasePrompt {
  /**
   * Create a new burial register prompt
   * @param {Object} config Configuration options
   */
  constructor(config = {}) {
    super({
      version: '1.0.0',
      description: 'Prompt template for extracting burial register data',
      fields: PAGE_FIELDS,
      providers: ['openai', 'anthropic'],
      ...config
    });

    this.pageFields = PAGE_FIELDS;
    this.entryFields = ENTRY_FIELDS;
  }

  /**
   * Get the complete prompt text with extraction instructions
   * @returns {string} Formatted prompt text
   */
  getPromptText() {
    return `You are an expert in reading historical burial registers.

Extract the data from the provided page image and return a single JSON object with this exact structure:
{
  "volume_id": string,
  "page_number": integer,
  "parish_header_raw": string | null,
  "county_header_raw": string | null,
  "year_header_raw": string | null,
  "page_marginalia_raw": string | null,
  "entries": [
    {
      "row_index_on_page": integer,           // 1-based position of the row on the page
      "entry_id": string,                     // leave blank/null, will be generated downstream
      "entry_no_raw": string | null,          // entry number as written
      "name_raw": string | null,              // full name as written
      "abode_raw": string | null,             // abode/residence as written
      "burial_date_raw": string | null,       // burial date as written (allow partial/uncertain)
      "age_raw": string | null,               // age as written
      "officiant_raw": string | null,         // officiant/ministers initials or name
      "marginalia_raw": string | null,        // entry-level marginalia
      "extra_notes_raw": string | null,       // any extra notes for the entry
      "row_ocr_raw": string | null,           // raw OCR text for the entire row
      "uncertainty_flags": [string]           // array of uncertainty notes; use [] if none
    }
  ]
}

Important instructions:
- Preserve the original spelling/punctuation from the page. Do not standardise or infer.
- If a field is missing or unreadable, use null (or [] for uncertainty_flags).
- Do not add extra fields or nesting beyond what is shown.
- Maintain the original row order; set row_index_on_page starting at 1 and incrementing.
- Return only the JSON object, nothing else.

TRANSCRIPTION NOTATION RULES:
- Use single dashes (-) for each illegible character/digit
- Use pipes (|) for line breaks in text fields, never newlines
- Preserve original spelling exactly`;
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
          systemPrompt: 'You are an expert OCR system trained by OpenAI, specialising in structured extraction from historical burial registers.',
          userPrompt: `${basePrompt}\n\nResponse Format:\n- Use response_format: { type: "json" }\n- Return a single JSON object matching the schema above\n- Ensure numeric fields (page_number, row_index_on_page) are integers\n- Use null for missing text fields and [] for uncertainty_flags`
        };

      case 'anthropic':
        return {
          systemPrompt: 'You are Claude, an expert OCR system trained by Anthropic, specialising in structured extraction from historical burial registers.',
          userPrompt: `${basePrompt}\n\nResponse Format:\n- Return valid JSON only (no markdown)\n- Return a single JSON object matching the schema above\n- Ensure numeric fields (page_number, row_index_on_page) are integers\n- Use null for missing text fields and [] for uncertainty_flags`
        };

      default:
        return { userPrompt: basePrompt };
    }
  }

  /**
   * Validate and normalize page-level burial register data
   * @param {Object} pageDataRaw Raw page JSON from the provider
   * @returns {Object} Validated page data with entries array preserved
   */
  validateAndConvertPage(pageDataRaw) {
    if (!pageDataRaw || typeof pageDataRaw !== 'object') {
      throw new Error('Page data must be an object with required fields');
    }

    const errors = [];
    let pageData = {};

    try {
      pageData = super.validateAndConvert(pageDataRaw);
    } catch (error) {
      if (error.details?.length) {
        errors.push(...error.details);
      } else {
        errors.push(error.message);
      }
    }

    if (!('entries' in pageDataRaw)) {
      errors.push('Entries array is required');
    } else if (!Array.isArray(pageDataRaw.entries)) {
      errors.push('Entries must be an array');
    } else {
      const invalidIndex = pageDataRaw.entries.findIndex(entry => entry !== null && typeof entry !== 'object');
      if (invalidIndex !== -1) {
        errors.push(`Entry at index ${invalidIndex} must be an object`);
      }
    }

    if (errors.length > 0) {
      const error = new Error(errors[0]);
      error.details = errors;
      throw error;
    }

    return {
      ...pageData,
      entries: pageDataRaw.entries || []
    };
  }

  /**
   * Validate and normalize an individual entry object
   * @param {Object} entryRaw Raw entry data
   * @returns {Object} Validated entry data
   */
  validateAndConvertEntry(entryRaw) {
    if (!entryRaw || typeof entryRaw !== 'object') {
      throw new Error('Entry must be an object with required fields');
    }

    const errors = [];
    const result = {};

    for (const [fieldName, field] of Object.entries(this.entryFields)) {
      if (field.metadata?.required && !(fieldName in entryRaw)) {
        errors.push(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`);
      }
    }

    for (const fieldName of Object.keys(this.entryFields)) {
      if (fieldName === 'uncertainty_flags') {
        const flagsRaw = fieldName in entryRaw ? entryRaw[fieldName] : [];

        if (flagsRaw === null || flagsRaw === undefined) {
          result.uncertainty_flags = [];
        } else if (!Array.isArray(flagsRaw)) {
          errors.push('uncertainty_flags must be an array of strings');
        } else {
          const invalidIndex = flagsRaw.findIndex(flag => typeof flag !== 'string');
          if (invalidIndex !== -1) {
            errors.push(`uncertainty_flags must be an array of strings (invalid value at index ${invalidIndex})`);
          } else {
            result.uncertainty_flags = flagsRaw.map(flag => flag.trim());
          }
        }
        continue;
      }

      try {
        const value = fieldName in entryRaw ? entryRaw[fieldName] : null;
        result[fieldName] = this.validateEntryField(fieldName, value);
      } catch (error) {
        errors.push(error.message);
      }
    }

    if (errors.length > 0) {
      const error = new Error(errors[0]);
      error.details = errors;
      throw error;
    }

    return result;
  }

  validateEntryField(fieldName, value) {
    const field = this.entryFields[fieldName];

    if (!field) {
      throw new Error(`Unknown field: ${fieldName}`);
    }

    if (value === null || value === undefined) {
      return null;
    }

    const fieldType = typeof field.type === 'object' ? field.type.name : field.type;
    let convertedValue = value;

    if (typeof value === 'string' && value.trim() !== '') {
      switch (fieldType) {
        case 'integer': {
          const intValue = parseInt(value.trim(), 10);
          if (!isNaN(intValue) && intValue.toString() === value.trim()) {
            convertedValue = intValue;
          }
          break;
        }
        case 'float': {
          const floatValue = parseFloat(value.trim());
          if (!isNaN(floatValue)) {
            convertedValue = floatValue;
          }
          break;
        }
        case 'boolean': {
          const lowerValue = value.toLowerCase().trim();
          if (lowerValue === 'true') {
            convertedValue = true;
          } else if (lowerValue === 'false') {
            convertedValue = false;
          }
          break;
        }
        case 'date': {
          const dateValue = new Date(value);
          if (!isNaN(dateValue.getTime())) {
            convertedValue = dateValue;
          }
          break;
        }
      }
    }

    const result = validateValue(convertedValue, fieldType, field.metadata);

    if (result.errors.length > 0) {
      const errorMessages = result.errors.map(error => {
        let transformedError = error.replace('Value', fieldName.charAt(0).toUpperCase() + fieldName.slice(1));

        if (transformedError.includes('Invalid integer value:')) {
          const valueMatch = transformedError.match(/Invalid integer value: (.+)/);
          const invalidValue = valueMatch ? valueMatch[1] : 'unknown';
          transformedError = `Cannot convert value "${invalidValue}" to integer`;
        }
        if (transformedError.includes('Invalid float value:')) {
          const valueMatch = transformedError.match(/Invalid float value: (.+)/);
          const invalidValue = valueMatch ? valueMatch[1] : 'unknown';
          transformedError = `Cannot convert value "${invalidValue}" to float`;
        }
        if (transformedError.includes('Invalid boolean value:')) {
          transformedError = transformedError.replace('Invalid boolean value:', 'Invalid boolean value');
        }
        if (transformedError.includes('Invalid date value:')) {
          transformedError = transformedError.replace('Invalid date value:', 'Invalid date value');
        }

        return transformedError;
      });
      throw new Error(errorMessages[0]);
    }

    return result.value;
  }
}

module.exports = BurialRegisterPrompt;
