const TypographicAnalysisPrompt = require('../../../../src/utils/prompts/templates/TypographicAnalysisPrompt');
const BasePrompt = require('../../../../src/utils/prompts/BasePrompt');
const { ProcessingError, isEmptySheetError } = require('../../../../src/utils/errorTypes');

describe('TypographicAnalysisPrompt', () => {
    let prompt;

    beforeEach(() => {
        prompt = new TypographicAnalysisPrompt();
    });

    test('should verify strict inheritance from BasePrompt', () => {
        expect(prompt).toBeInstanceOf(BasePrompt);
    });

    describe('getProviderPrompt', () => {
        test('should return correct structure for openai', () => {
            const result = prompt.getProviderPrompt('openai');
            expect(result).toHaveProperty('systemPrompt');
            expect(result).toHaveProperty('userPrompt');

            // Verify key instructions exist in the prompts
            expect(result.systemPrompt + result.userPrompt).toMatch(/line-for-line/i);
            expect(result.systemPrompt + result.userPrompt).toMatch(/dash/i); // illegible notation
            expect(result.systemPrompt + result.userPrompt).toMatch(/botanical|mechanical/i);
        });

        test('should return correct structure for anthropic', () => {
            const result = prompt.getProviderPrompt('anthropic');
            expect(result).toHaveProperty('systemPrompt');
            expect(result).toHaveProperty('messages');
            expect(Array.isArray(result.messages)).toBe(true);

            const promptText = result.systemPrompt + JSON.stringify(result.messages);
            expect(promptText).toMatch(/line-for-line/i);
        });

        test('should throw error for unsupported provider', () => {
            expect(() => {
                prompt.getProviderPrompt('unsupported_provider');
            }).toThrow(/provider not supported/i);
        });

        test('should throw validation error for null provider', () => {
            expect(() => {
                prompt.getProviderPrompt(null);
            }).toThrow();
        });
    });

    describe('validateAndConvert', () => {
        const validFullResponse = {
            transcription_raw: 'HERE LIES|JOHN SMITH',
            stone_condition: 'Weathered limestone',
            structural_observations: 'Centred text',
            typography_analysis: { style: 'Roman', serifs: 'Slab' },
            iconography: { type: 'Cross', features: ['Ribbed volutes'] },
            // Optional fields explicitly null for complete match
            memorial_number: null,
            first_name: null,
            last_name: null,
            year_of_death: null,
            inscription: null
        };

        const validMinimalResponse = {
            transcription_raw: 'JANE DOE',
            // Optional fields omitted or null
            stone_condition: null,
            structural_observations: null,
            typography_analysis: null,
            iconography: null
        };

        test('should validate a complete valid response', () => {
            const result = prompt.validateAndConvert(validFullResponse);
            expect(result).toEqual(validFullResponse);
        });

        test('should validate a minimal valid response', () => {
            const result = prompt.validateAndConvert(validMinimalResponse);
            expect(result).toMatchObject(validMinimalResponse);
        });

        test('should throw ProcessingError for null input', () => {
            expect(() => {
                prompt.validateAndConvert(null);
            }).toThrow(ProcessingError);
        });

        test('should throw specific type for empty object', () => {
            try {
                prompt.validateAndConvert({});
            } catch (error) {
                expect(error).toBeInstanceOf(ProcessingError);
                expect(isEmptySheetError(error)).toBe(true); // Should map to empty_monument/empty_sheet concept
            }
        });

        test('should throw validation error if transcription_raw is missing', () => {
            const invalidResponse = { ...validFullResponse };
            delete invalidResponse.transcription_raw;

            expect(() => {
                prompt.validateAndConvert(invalidResponse);
            }).toThrow(/transcription_raw is required/i);
        });

        test('should throw specialized error for prohibted notation [?]', () => {
            const invalidResponse = {
                ...validFullResponse,
                transcription_raw: 'Agnes [?] Smith'
            };

            expect(() => {
                prompt.validateAndConvert(invalidResponse);
            }).toThrow(/prohibited notation/i);
        });

        test('should preserve historical characters', () => {
            const historicalResponse = {
                ...validMinimalResponse,
                transcription_raw: 'Here lieſ ye Body'
            };

            const result = prompt.validateAndConvert(historicalResponse);
            expect(result.transcription_raw).toBe('Here lieſ ye Body');
        });

        test('should throw error for malformed iconography structure', () => {
            const invalidResponse = {
                ...validFullResponse,
                iconography: "Just a string description" // Should be object
            };

            expect(() => {
                prompt.validateAndConvert(invalidResponse);
            }).toThrow(/iconography/i); // Should mention field name in error
        });
    });
});
