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
});
