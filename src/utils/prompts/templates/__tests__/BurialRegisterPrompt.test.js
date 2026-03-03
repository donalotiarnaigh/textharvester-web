const BurialRegisterPrompt = require('../BurialRegisterPrompt');

const samplePageData = {
  volume_id: 'vol1',
  page_number: 5,
  parish_header_raw: 'St Luke Parish',
  county_header_raw: 'Middlesex',
  year_header_raw: '1832',
  page_marginalia_raw: 'Torn corner on bottom right',
  entries: [
    {
      row_index_on_page: 1,
      entry_no_raw: '12',
      name_raw: 'John Smith',
      abode_raw: 'Shoreditch',
      burial_date_raw: '1832-03-10',
      age_raw: '42',
      officiant_raw: 'J. Doe',
      marginalia_raw: null,
      extra_notes_raw: 'illegible line ending',
      row_ocr_raw: '12 John Smith Shoreditch 10 Mar 1832 42 J. Doe',
      uncertainty_flags: ['smudged_age']
    },
    {
      row_index_on_page: 2,
      entry_id: null,
      entry_no_raw: '13',
      name_raw: 'Mary Jones',
      abode_raw: 'Bethnal Green',
      burial_date_raw: '1832-03-11',
      age_raw: '36',
      officiant_raw: 'A. Brown',
      marginalia_raw: 'note in margin',
      extra_notes_raw: null,
      row_ocr_raw: '13 Mary Jones Bethnal Green 11 Mar 1832 36 A. Brown',
      uncertainty_flags: []
    }
  ]
};

describe('BurialRegisterPrompt metadata', () => {
  it('has version 1.1.0', () => {
    const prompt = new BurialRegisterPrompt();
    expect(prompt.version).toBe('1.1.0');
  });
});

describe('BurialRegisterPrompt prompt text', () => {
  let prompt;

  beforeEach(() => {
    prompt = new BurialRegisterPrompt();
  });

  it('instructs confidence scoring for parish_header_raw', () => {
    const text = prompt.getPromptText();
    expect(text).toMatch(/parish_header_raw/);
    // Must not exclude page-level fields from confidence scoring
    expect(text).not.toMatch(/not the top-level page fields/);
  });

  it('instructs confidence scoring for county_header_raw', () => {
    const text = prompt.getPromptText();
    expect(text).toMatch(/county_header_raw/);
  });

  it('instructs confidence scoring for year_header_raw', () => {
    const text = prompt.getPromptText();
    expect(text).toMatch(/year_header_raw/);
  });

  it('shows {value, confidence} envelope format for header fields in schema', () => {
    const text = prompt.getPromptText();
    // The schema should describe confidence envelopes for all text fields
    expect(text).toMatch(/\{.*value.*confidence.*\}/s);
  });
});

describe('BurialRegisterPrompt validation', () => {
  let prompt;

  beforeEach(() => {
    prompt = new BurialRegisterPrompt();
  });

  describe('validateAndConvertPage', () => {
    it('returns validated page data with entries when structure is valid', () => {
      const result = prompt.validateAndConvertPage(samplePageData);

      expect(result.volume_id).toBe('vol1');
      expect(result.page_number).toBe(5);
      expect(result.parish_header_raw).toBe('St Luke Parish');
      expect(result.entries).toHaveLength(2);
      expect(result.entries).toBe(samplePageData.entries);
    });

    it('throws descriptive error when required page fields are missing', () => {
      const invalidPage = {
        page_number: 1,
        entries: []
      };

      expect(() => prompt.validateAndConvertPage(invalidPage))
        .toThrow('Volume_id is required');
    });

    it('throws descriptive error when entries are missing', () => {
      const invalidPage = {
        volume_id: 'vol2',
        page_number: 3
      };

      expect(() => prompt.validateAndConvertPage(invalidPage))
        .toThrow('Entries array is required');
    });

    it('captures confidence scores for parish_header_raw when returned as envelope', () => {
      const pageWithEnvelopes = {
        ...samplePageData,
        parish_header_raw: { value: 'St Luke Parish', confidence: 0.9 },
        county_header_raw: { value: 'Middlesex', confidence: 0.85 },
        year_header_raw: { value: '1832', confidence: 0.95 }
      };

      const result = prompt.validateAndConvertPage(pageWithEnvelopes);

      expect(result._confidence_scores).toBeDefined();
      expect(result._confidence_scores.parish_header_raw).toBe(0.9);
    });

    it('captures confidence scores for county_header_raw when returned as envelope', () => {
      const pageWithEnvelopes = {
        ...samplePageData,
        parish_header_raw: { value: 'St Luke Parish', confidence: 0.9 },
        county_header_raw: { value: 'Middlesex', confidence: 0.85 },
        year_header_raw: { value: '1832', confidence: 0.95 }
      };

      const result = prompt.validateAndConvertPage(pageWithEnvelopes);

      expect(result._confidence_scores.county_header_raw).toBe(0.85);
    });

    it('captures confidence scores for year_header_raw when returned as envelope', () => {
      const pageWithEnvelopes = {
        ...samplePageData,
        parish_header_raw: { value: 'St Luke Parish', confidence: 0.9 },
        county_header_raw: { value: 'Middlesex', confidence: 0.85 },
        year_header_raw: { value: '1832', confidence: 0.95 }
      };

      const result = prompt.validateAndConvertPage(pageWithEnvelopes);

      expect(result._confidence_scores.year_header_raw).toBe(0.95);
    });

    it('sets confidence to null for header fields returned as plain scalars', () => {
      // Plain scalars (no envelope) must yield null confidence, not a fake 1.0
      const result = prompt.validateAndConvertPage(samplePageData);

      expect(result._confidence_scores).toBeDefined();
      expect(result._confidence_scores.parish_header_raw).toBeNull();
      expect(result._confidence_scores.county_header_raw).toBeNull();
      expect(result._confidence_scores.year_header_raw).toBeNull();
    });
  });

  describe('validateAndConvertEntry', () => {
    it('returns validated entry with normalized values', () => {
      const entry = {
        ...samplePageData.entries[0],
        row_index_on_page: '3',
        uncertainty_flags: ['uncertain_abode', ' unclear_age ']
      };

      const result = prompt.validateAndConvertEntry(entry);

      expect(result.row_index_on_page).toBe(3);
      expect(result.uncertainty_flags).toEqual(['uncertain_abode', 'unclear_age']);
      expect(result.name_raw).toBe('John Smith');
    });

    it('throws descriptive error when required entry fields are missing', () => {
      const invalidEntry = {
        name_raw: 'Missing Row Index'
      };

      expect(() => prompt.validateAndConvertEntry(invalidEntry))
        .toThrow('Row_index_on_page is required');
    });

    it('throws descriptive error when uncertainty_flags is invalid', () => {
      const invalidEntry = {
        ...samplePageData.entries[0],
        uncertainty_flags: 'not-an-array'
      };

      expect(() => prompt.validateAndConvertEntry(invalidEntry))
        .toThrow('uncertainty_flags must be an array of strings');
    });
  });

  describe('cross-field validation', () => {
    it('flags IMPLAUSIBLE_AGE when age_raw is "200"', () => {
      const entry = {
        ...samplePageData.entries[0],
        age_raw: '200'
      };

      const result = prompt.validateAndConvertEntry(entry);

      expect(result._validation_warnings).toBeDefined();
      expect(result._validation_warnings.some(w => w.includes('IMPLAUSIBLE_AGE'))).toBe(true);
    });

    it('caps age_raw confidence to 0.4 when age exceeds 150', () => {
      const entry = {
        ...samplePageData.entries[0],
        age_raw: { value: '200', confidence: 0.95 }
      };

      const result = prompt.validateAndConvertEntry(entry);

      expect(result._confidence_scores.age_raw).toBeLessThanOrEqual(0.4);
    });

    it('flags IMPLAUSIBLE_AGE when age_raw is "200 years"', () => {
      const entry = {
        ...samplePageData.entries[0],
        age_raw: '200 years'
      };

      const result = prompt.validateAndConvertEntry(entry);

      expect(result._validation_warnings).toBeDefined();
      expect(result._validation_warnings.some(w => w.includes('IMPLAUSIBLE_AGE'))).toBe(true);
    });

    it('does not flag IMPLAUSIBLE_AGE when age_raw is "42"', () => {
      const entry = {
        ...samplePageData.entries[0],
        age_raw: '42'
      };

      const result = prompt.validateAndConvertEntry(entry);

      expect(result._validation_warnings).toBeUndefined();
    });

    it('does not flag IMPLAUSIBLE_AGE when age_raw is null', () => {
      const entry = {
        ...samplePageData.entries[0],
        age_raw: null
      };

      const result = prompt.validateAndConvertEntry(entry);

      expect(result._validation_warnings).toBeUndefined();
    });
  });
});
