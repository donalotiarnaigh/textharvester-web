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
  }
}

module.exports = BurialRegisterPrompt;
