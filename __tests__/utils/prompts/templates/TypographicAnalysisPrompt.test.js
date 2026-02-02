const TypographicAnalysisPrompt = require('../../../../src/utils/prompts/templates/TypographicAnalysisPrompt');
const BasePrompt = require('../../../../src/utils/prompts/BasePrompt');

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
            }).toThrow(/unsupported provider/i);
        });

        test('should throw validation error for null provider', () => {
            expect(() => {
                prompt.getProviderPrompt(null);
            }).toThrow();
        });
    });
});
