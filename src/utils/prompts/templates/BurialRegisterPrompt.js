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
}

module.exports = BurialRegisterPrompt;
