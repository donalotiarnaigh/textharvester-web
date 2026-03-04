/**
 * @jest-environment node
 */

/**
 * Test suite for database.js storage layer updates
 * Tests storeMemorial() function with typographic analysis columns.
 * 
 * Requirements covered:
 * - 4.1: storeMemorial() with full typographic data stores all fields
 * - 4.4: JSON fields serialized correctly in database
 * - 5.1: Null analysis fields stored as NULL (not empty string)
 * - 5.2: Existing storeMemorial() calls work unchanged (backward compat)
 * 
 * @see docs/typographic-analysis/tasks.md Task 1.3/1.4
 */

// 1. Mock sqlite3 BEFORE importing the database module
const mockRun = jest.fn();
const mockAll = jest.fn();
const mockGet = jest.fn();

// Mock Database class structure
const MockDatabase = jest.fn(() => ({
  run: mockRun,
  all: mockAll,
  get: mockGet,
  serialize: jest.fn(cb => cb()), // execute callback immediately
  close: jest.fn()
}));

// Mock verbose() to return the same object containing Database
const mockVerbose = jest.fn(() => ({
  Database: MockDatabase
}));

jest.mock('sqlite3', () => ({
  verbose: mockVerbose,
  Database: MockDatabase // In case verbose() isn't called directly for the class
}));

// Mock logger to suppress output
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock fs and mkdirSync to prevent directory creation issues
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => true), // pretend DB dir exists
  mkdirSync: jest.fn()
}));

describe('Database Storage Layer: Typographic Analysis Fields', () => {
  let storeMemorial;

  // Test fixtures from design.md
  const validCompleteData = {
    memorial_number: null,
    first_name: 'JOHN',
    last_name: 'SMITH',
    year_of_death: 1857,
    inscription: 'IN LOVING MEMORY OF JOHN SMITH',
    fileName: 'test_memorial.jpg',
    ai_provider: 'openai',
    model_version: 'gpt-4o',
    prompt_template: 'TypographicAnalysisPrompt',
    prompt_version: '1.0.0',
    source_type: 'typographic_analysis',
    site_code: 'TEST01',
    transcription_raw: 'IN LOVING MEMORY|OF|JOHN SMITH|WHO DEPARTED THIS LIFE|APRIL 10TH 1857|AGED 72 YEARS|R.I.P.',
    stone_condition: 'Limestone, moderate weathering, moss on lower portion',
    typography_analysis: {
      serif_style: 'Roman serif with bracketed terminals',
      italic_usage: false,
      long_s_present: false,
      thorn_present: false,
      superscript_usage: ['TH'],
      case_style: 'All capitals',
      letter_consistency_notes: null
    },
    iconography: {
      visual_motifs: ['Celtic cross', 'IHS monogram'],
      geometric_elements: ['Concentric circles at cross center'],
      border_foliage: ['Cordate leaves', 'Undulating vine border'],
      daisy_wheels: false,
      style_technique: {
        period: 'Victorian Gothic Revival',
        carving_depth: 'High relief',
        regional_style: 'Irish rural'
      }
    },
    structural_observations: '7 rows, centered alignment, decreasing font size toward bottom'
  };

  const legacyData = {
    memorial_number: 123,
    first_name: 'MARY',
    last_name: 'DOE',
    year_of_death: 1920,
    inscription: 'MARY DOE RIP',
    fileName: 'legacy_memorial.jpg',
    ai_provider: 'anthropic',
    model_version: 'claude-3-sonnet',
    prompt_template: 'MemorialOCRPrompt',
    prompt_version: '1.0.0',
    source_type: 'memorial',
    site_code: 'LEGACY01'
    // No typographic analysis fields - backward compatibility test
  };

  beforeAll(() => {
    // Require the REAL database module
    // It will use the mocked sqlite3
    jest.isolateModules(() => {
      const dbModule = require('../../src/utils/database');
      storeMemorial = dbModule.storeMemorial;
    });
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Default behavior for run: callback with success and lastID
    mockRun.mockImplementation(function (sql, params, callback) {
      // params is optional in sqlite3, so check arguments
      const cb = typeof params === 'function' ? params : callback;
      if (cb) {
        // Call with 'this' context having lastID
        cb.call({ lastID: 1 }, null);
      }
      return this;
    });
  });

  describe('Happy Path: Full Typographic Data Storage', () => {
    /**
         * Requirement 4.1: storeMemorial() with full typographic data stores all fields
         */
    it('should store all typographic analysis fields when provided', async () => {
      const data = validCompleteData;
      const id = await storeMemorial(data);

      expect(id).toBe(1);

      // Verify the SQL and params passed to db.run
      const [sql, params] = mockRun.mock.calls.find(call =>
        call[0].includes('INSERT INTO memorials')
      );

      // Check SQL contains new columns
      expect(sql).toContain('transcription_raw');
      expect(sql).toContain('stone_condition');
      expect(sql).toContain('typography_analysis');
      expect(sql).toContain('iconography');
      expect(sql).toContain('structural_observations');

      // Check params contain mapped values
      // 0-11: Original fields
      // 12: transcription_raw
      // 13: stone_condition
      // 14: typography_analysis (JSON)
      // 15: iconography (JSON)
      // 16: structural_observations
      // 17: confidence_scores (JSON)
      // 18: needs_review
      // 19: validation_warnings (JSON)
      // 20: input_tokens
      // 21: output_tokens
      // 22: estimated_cost_usd
      expect(params).toHaveLength(23);

      expect(params[12]).toBe(data.transcription_raw);
      expect(params[13]).toBe(data.stone_condition);
      expect(JSON.parse(params[14])).toEqual(data.typography_analysis);
      expect(JSON.parse(params[15])).toEqual(data.iconography);
      expect(params[16]).toBe(data.structural_observations);
      // Cost columns (positions 20–22)
      expect(typeof params[20]).toBe('number'); // input_tokens
      expect(typeof params[21]).toBe('number'); // output_tokens
      expect(typeof params[22]).toBe('number'); // estimated_cost_usd
    });

    /**
         * Requirement 4.4: JSON fields serialized correctly in database
         */
    it('should serialize typography_analysis object to valid JSON string', async () => {
      const data = {
        ...validCompleteData,
        typography_analysis: {
          serif_style: 'Roman serif',
          long_s_present: true,
          superscript_usage: ['th', 'nd']
        }
      };

      await storeMemorial(data);

      const [, params] = mockRun.mock.calls.find(call => call[0].includes('INSERT INTO memorials'));
      const typographyJson = params[14];

      expect(typeof typographyJson).toBe('string');
      const parsed = JSON.parse(typographyJson);
      expect(parsed.serif_style).toBe('Roman serif');
      expect(parsed.long_s_present).toBe(true);
      expect(parsed.superscript_usage).toEqual(['th', 'nd']);
    });

    it('should serialize iconography object with nested style_technique', async () => {
      const iconographyData = {
        visual_motifs: ['Celtic cross'],
        daisy_wheels: false,
        style_technique: {
          period: 'Victorian',
          carving_depth: 'High relief'
        }
      };

      const data = {
        ...validCompleteData,
        iconography: iconographyData
      };

      await storeMemorial(data);

      const [, params] = mockRun.mock.calls.find(call => call[0].includes('INSERT INTO memorials'));
      const iconographyJson = params[15];

      expect(typeof iconographyJson).toBe('string');
      const parsed = JSON.parse(iconographyJson);
      expect(parsed.visual_motifs).toEqual(['Celtic cross']);
      expect(parsed.style_technique.period).toBe('Victorian');
    });

    /**
         * Requirement 2.1/2.2: Historical characters (ſ, þ) preserved in transcription_raw
         */
    it('should preserve historical characters (long-s, thorn) in transcription_raw', async () => {
      const transcriptionWithHistorical = 'HERE LYETH þe BODY|OF THOMAS ſMITH|WHO DEPARTED þIS LIFE';

      const data = {
        ...validCompleteData,
        transcription_raw: transcriptionWithHistorical
      };

      await storeMemorial(data);

      const [, params] = mockRun.mock.calls.find(call => call[0].includes('INSERT INTO memorials'));
      const storedTranscription = params[12];

      expect(storedTranscription).toBe(transcriptionWithHistorical);
      expect(storedTranscription).toContain('ſ');
      expect(storedTranscription).toContain('þ');
    });
  });

  describe('Happy Path: Null Handling', () => {
    /**
         * Requirement 5.1: Null analysis fields stored as NULL (not empty string)
         */
    it('should store NULL for null analysis fields, not empty string', async () => {
      const data = {
        fileName: 'test.jpg',
        ai_provider: 'openai',
        source_type: 'typographic_analysis',
        transcription_raw: 'SOME TEXT|LINE 2',
        stone_condition: null,
        typography_analysis: null,
        iconography: null,
        structural_observations: null
      };

      await storeMemorial(data);

      const [, params] = mockRun.mock.calls.find(call => call[0].includes('INSERT INTO memorials'));

      // Null analysis fields should be null, not empty string
      expect(params[13]).toBeNull(); // stone_condition
      expect(params[14]).toBeNull(); // typography_analysis
      expect(params[15]).toBeNull(); // iconography
      expect(params[16]).toBeNull(); // structural_observations

      // But transcription_raw should have its value
      expect(params[12]).toBe('SOME TEXT|LINE 2');
    });
  });

  describe('Backward Compatibility', () => {
    /**
         * Requirement 5.2: Existing storeMemorial() calls work unchanged
         */
    it('should store records without new fields (backward compat)', async () => {
      const data = legacyData;

      await storeMemorial(data);

      const [, params] = mockRun.mock.calls.find(call => call[0].includes('INSERT INTO memorials'));

      // Original fields should be stored correctly
      // 0=memorial_number, 1=first_name, 2=last_name (names might be different order, checking based on previous usage)
      // SQL: memorial_number, first_name, last_name, year_of_death...
      // Let's rely on mapping logic being consistent

      // New typographic fields should be null when not provided
      expect(params[12]).toBeNull(); // transcription_raw
      expect(params[13]).toBeNull(); // stone_condition
      expect(params[14]).toBeNull(); // typography_analysis
      expect(params[15]).toBeNull(); // iconography
      expect(params[16]).toBeNull(); // structural_observations
    });
  });

  describe('Unhappy Path: Error Handling', () => {
    /**
         * Requirement 4.4: Circular reference in iconography throws serialization error
         */
    it('should throw serialization error for circular reference in iconography', async () => {
      // Create circular reference
      const circular = { visual_motifs: [] };
      circular.self = circular;

      const data = {
        fileName: 'test.jpg',
        iconography: circular
      };

      // storeMemorial calls JSON.stringify which throws
      await expect(storeMemorial(data)).rejects.toThrow(/circular|cyclic/i);
    });

    /**
         * Edge case: Undefined vs null distinction
         */
    it('should handle undefined values same as null', async () => {
      const data = {
        fileName: 'test.jpg',
        ai_provider: 'openai',
        transcription_raw: undefined,
        stone_condition: undefined
      };

      await storeMemorial(data);

      const [, params] = mockRun.mock.calls.find(call => call[0].includes('INSERT INTO memorials'));

      // undefined should become null
      expect(params[12]).toBeNull(); // transcription_raw
      expect(params[13]).toBeNull(); // stone_condition
    });

    /**
         * Error case: Database error should propagate
         */
    it('should propagate database errors', async () => {
      // Make mock throw error for next call
      mockRun.mockImplementationOnce((sql, params, cb) => {
        const callback = typeof params === 'function' ? params : cb;
        callback(new Error('DB Error'));
      });

      await expect(storeMemorial({ fileName: 'error.jpg' }))
        .rejects.toThrow('DB Error');
    });
  });
});
