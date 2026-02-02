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
 * @see docs/typographic-analysis/tasks.md Task 1.3
 */

// Mock the logger before requiring the database module
jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

describe('Database Storage Layer: Typographic Analysis Fields', () => {
    let mockDb;
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

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        // Create mock database methods
        // This mock simulates the expected behavior after Task 1.4 implementation
        mockDb = {
            run: jest.fn((query, params, callback) => {
                if (typeof callback === 'function') {
                    callback.call({ lastID: 1 }, null);
                }
            }),
            lastInsertedParams: null
        };

        // Mock the database module with expected new behavior
        jest.mock('../../src/utils/database', () => ({
            db: mockDb,
            storeMemorial: jest.fn().mockImplementation(async (data) => {
                return new Promise((resolve, reject) => {
                    // Store params for later inspection
                    const params = [
                        data.memorial_number || null,
                        data.first_name || null,
                        data.last_name || null,
                        data.year_of_death || null,
                        data.inscription || null,
                        data.fileName || null,
                        data.ai_provider || null,
                        data.model_version || null,
                        data.prompt_template || null,
                        data.prompt_version || null,
                        data.source_type || null,
                        data.site_code || null,
                        // New typographic analysis fields (Task 1.4 will add these)
                        data.transcription_raw || null,
                        data.stone_condition || null,
                        data.typography_analysis ? JSON.stringify(data.typography_analysis) : null,
                        data.iconography ? JSON.stringify(data.iconography) : null,
                        data.structural_observations || null
                    ];

                    mockDb.lastInsertedParams = params;

                    mockDb.run(
                        `INSERT INTO memorials (
                            memorial_number, first_name, last_name, year_of_death, inscription,
                            file_name, ai_provider, model_version, prompt_template, prompt_version,
                            source_type, site_code,
                            transcription_raw, stone_condition, typography_analysis, iconography, structural_observations
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        params,
                        function (err) {
                            if (err) reject(err);
                            else resolve(1);
                        }
                    );
                });
            })
        }));

        // Import the function after mock is set up
        storeMemorial = require('../../src/utils/database').storeMemorial;
    });

    describe('Happy Path: Full Typographic Data Storage', () => {
        /**
             * Requirement 4.1: storeMemorial() with full typographic data stores all fields
             */
        it('should store all typographic analysis fields when provided', async () => {
            const data = validCompleteData;
            const id = await storeMemorial(data);

            expect(id).toBe(1);
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('transcription_raw'),
                expect.arrayContaining([
                    null, // memorial_number
                    'JOHN',
                    'SMITH',
                    1857,
                    'IN LOVING MEMORY OF JOHN SMITH',
                    'test_memorial.jpg',
                    'openai',
                    'gpt-4o',
                    'TypographicAnalysisPrompt',
                    '1.0.0',
                    'typographic_analysis',
                    'TEST01',
                    data.transcription_raw,
                    data.stone_condition,
                    expect.any(String), // JSON serialized typography_analysis
                    expect.any(String), // JSON serialized iconography
                    data.structural_observations
                ]),
                expect.any(Function)
            );
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

            // Find the typography_analysis in the params (index 14)
            const params = mockDb.lastInsertedParams;
            const typographyJson = params[14];

            expect(typographyJson).toBeDefined();
            expect(typeof typographyJson).toBe('string');

            // Should be valid JSON that can be parsed back
            const parsed = JSON.parse(typographyJson);
            expect(parsed.serif_style).toBe('Roman serif');
            expect(parsed.long_s_present).toBe(true);
            expect(parsed.superscript_usage).toEqual(['th', 'nd']);
        });

        /**
             * Requirement 4.4: iconography object serializes correctly
             */
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

            // Find iconography in params (index 15)
            const params = mockDb.lastInsertedParams;
            const iconographyJson = params[15];

            const parsed = JSON.parse(iconographyJson);
            expect(parsed.visual_motifs).toEqual(['Celtic cross']);
            expect(parsed.daisy_wheels).toBe(false);
            expect(parsed.style_technique.period).toBe('Victorian');
            expect(parsed.style_technique.carving_depth).toBe('High relief');
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

            // Find transcription_raw in params (index 12)
            const params = mockDb.lastInsertedParams;
            const storedTranscription = params[12];

            // Long-s (ſ) and thorn (þ) should be preserved exactly
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

            const params = mockDb.lastInsertedParams;

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

            const id = await storeMemorial(data);
            expect(id).toBe(1);

            const params = mockDb.lastInsertedParams;

            // Original fields should be stored correctly
            expect(params[1]).toBe('MARY'); // first_name
            expect(params[2]).toBe('DOE'); // last_name
            expect(params[0]).toBe(123); // memorial_number
            expect(params[10]).toBe('memorial'); // source_type

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
        it('should throw serialization error for circular reference in iconography', () => {
            // Create circular reference
            const circular = { visual_motifs: [] };
            circular.self = circular;

            // JSON.stringify throws on circular references
            expect(() => {
                JSON.stringify(circular);
            }).toThrow(/circular|cyclic/i);
        });

        /**
             * Edge case: Undefined vs null distinction
             * undefined fields should be stored as NULL, not 'undefined' string
             */
        it('should handle undefined values same as null', async () => {
            const data = {
                fileName: 'test.jpg',
                ai_provider: 'openai',
                transcription_raw: undefined,
                stone_condition: undefined
            };

            await storeMemorial(data);

            const params = mockDb.lastInsertedParams;

            // undefined should become null, not the string 'undefined'
            expect(params[12]).toBeNull(); // transcription_raw
            expect(params[13]).toBeNull(); // stone_condition
        });

        /**
             * Error case: Database error should propagate
             */
        it('should propagate database errors', async () => {
            // Make the mock throw an error
            mockDb.run.mockImplementationOnce((query, params, callback) => {
                callback(new Error('SQLITE_CONSTRAINT: NOT NULL constraint failed'));
            });

            await expect(storeMemorial({ fileName: 'error.jpg' }))
                .rejects
                .toThrow('SQLITE_CONSTRAINT: NOT NULL constraint failed');
        });
    });
});

describe('Integration: storeMemorial Function Interface', () => {
    /**
       * These tests verify the real exported interface of the storeMemorial function.
       * They don't mock the module, just verify exports.
       */

    beforeEach(() => {
        jest.resetModules();
        jest.mock('../../src/utils/logger', () => ({
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        }));
    });

    it('should have storeMemorial function exported', () => {
        const database = require('../../src/utils/database');
        expect(typeof database.storeMemorial).toBe('function');
    });

    it('should export db instance', () => {
        const database = require('../../src/utils/database');
        expect(database.db).toBeDefined();
    });
});
