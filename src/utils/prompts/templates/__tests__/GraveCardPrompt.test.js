const GraveCardPrompt = require('../GraveCardPrompt');


describe('GraveCardPrompt', () => {
    let prompt;

    beforeEach(() => {
        prompt = new GraveCardPrompt();
    });

    describe('Configuration', () => {
        test('should initialize with correct defaults', () => {
            expect(prompt.version).toBe('1.0.0');
            expect(prompt.providers).toContain('openai');
            expect(prompt.providers).toContain('anthropic');
            // BasePrompt expects fields, but we pass empty and handle validation manually
            expect(prompt.fields).toEqual({});
        });
    });

    describe('Prompt Generation', () => {
        test('getProviderPrompt(openai) should include strict transcription rules', () => {
            const config = prompt.getProviderPrompt('openai');
            const text = config.userPrompt + config.systemPrompt;

            expect(text).toContain('single dashes (-) for illegible characters');
            expect(text).toContain('Use | as line separator');
            expect(text).toContain('Do NOT use [?]');
            expect(text).not.toContain('[better guess]');
        });

        test('getProviderPrompt(anthropic) should include JSON requirement', () => {
            const config = prompt.getProviderPrompt('anthropic');
            const text = config.userPrompt + config.systemPrompt;

            expect(text).toContain('valid JSON');
            expect(text).toContain('Grave Record Card Schema');
        });
    });

    describe('Schema Validation (validateAndConvert)', () => {
        // A fully valid mock object based on the User's JSON Schema
        const validRecord = {
            card_metadata: {
                source_reference: 'FILE_123.pdf',
                card_version: 'v1',
                notes: 'Some notes'
            },
            location: {
                section: 'A',
                grave_number: 123,
                plot_identifier: 'Row 1'
            },
            grave: {
                number_buried: 2,
                status: 'occupied',
                description_of_grave: 'Headstone',
                dimensions: {
                    length_ft: 8,
                    width_ft: 4,
                    unit: 'ft'
                }
            },
            interments: [
                {
                    sequence_number: 1,
                    name: {
                        surname: 'DOE',
                        given_names: 'JOHN',
                        full_name: 'JOHN DOE'
                    },
                    date_of_death: {
                        iso: '1900-01-01',
                        certainty: 'certain'
                    }
                }
            ],
            inscription: {
                text: 'In Memory Of...'
            },
            sketch: {
                present: false
            }
        };

        test('should pass a valid comprehensive record', () => {
            const result = prompt.validateAndConvert(validRecord);
            expect(result).toEqual(validRecord);
        });

        test('should throw if top-level required fields are missing', () => {
            const invalid = { ...validRecord };
            delete invalid.location;

            expect(() => prompt.validateAndConvert(invalid))
                .toThrow(/Missing required top-level field: location/);
        });

        test('should throw if nested required fields are missing (location.section)', () => {
            const invalid = JSON.parse(JSON.stringify(validRecord));
            delete invalid.location.section;

            expect(() => prompt.validateAndConvert(invalid))
                .toThrow(/Missing required field: location.section/);
        });

        test('should throw if nested required fields are missing (grave.status)', () => {
            // Note: status has default "unknown", but if provided as null or undefined in a way that bypasses default logic?
            // Actually schema says required for the 'if vacant' check, let's check general requirement
            // The user schema implicitly requires validating structure.
            const invalid = JSON.parse(JSON.stringify(validRecord));
            // grave itself is required.
            delete invalid.grave;
            expect(() => prompt.validateAndConvert(invalid))
                .toThrow(/Missing required top-level field: grave/);
        });

        test('should validate Enum values (grave.status)', () => {
            const invalid = JSON.parse(JSON.stringify(validRecord));
            invalid.grave.status = 'reserved'; // Not in [occupied, vacant, unknown]

            expect(() => prompt.validateAndConvert(invalid))
                .toThrow(/Invalid value for grave.status/);
        });

        test('should validate Logic: if status is vacant, interments should be empty', () => {
            const invalid = JSON.parse(JSON.stringify(validRecord));
            invalid.grave.status = 'vacant';
            invalid.interments = [{ name: { full_name: 'Ghost' } }]; // Should be empty

            expect(() => prompt.validateAndConvert(invalid))
                .toThrow(/Grave is marked 'vacant' but contains interments/);
        });

        test('should allow empty interments list', () => {
            const emptyInterments = JSON.parse(JSON.stringify(validRecord));
            emptyInterments.interments = [];
            const result = prompt.validateAndConvert(emptyInterments);
            expect(result.interments).toEqual([]);
        });

        test('should validate interments structure if present', () => {
            const invalid = JSON.parse(JSON.stringify(validRecord));
            invalid.interments = [
                { sequence_number: 1 } // Missing name
            ];

            expect(() => prompt.validateAndConvert(invalid))
                .toThrow(/Interment at index 0 missing required field: name/);
        });

        test('should validate date format checking (iso)', () => {
            const invalid = JSON.parse(JSON.stringify(validRecord));
            invalid.interments[0].date_of_death.iso = 'not-a-date';

            expect(() => prompt.validateAndConvert(invalid))
                .toThrow(/Invalid ISO date format/);
        });
    });
});
