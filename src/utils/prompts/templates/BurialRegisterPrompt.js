const BasePrompt = require('../BasePrompt');
const { StringType, IntegerType } = require('../types/dataTypes');

const PAGE_FIELDS = {
  volume_id: {
    type: new StringType(),
    description: 'Volume identifier for the burial register',
    metadata: { required: true, format: 'identifier', maxLength: 50 }
  },
  page_number: {
    type: new IntegerType(),
    description: 'Sequential page number within the volume',
    metadata: { required: true, min: 1 }
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
- Return only the JSON object, nothing else.`;
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

    default:
      return { userPrompt: basePrompt };
    }
  }
}

module.exports = BurialRegisterPrompt;
