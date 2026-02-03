const { getPrompt, promptManager } = require('../../../../src/utils/prompts/templates/providerTemplates');
const TypographicAnalysisPrompt = require('../../../../src/utils/prompts/templates/TypographicAnalysisPrompt');

describe('Provider Templates - Typographic Analysis', () => {
  test('retrieves typographic analysis prompt for openai', () => {
    const prompt = getPrompt('openai', 'typographicAnalysis');
    expect(prompt).toBeInstanceOf(TypographicAnalysisPrompt);
    expect(prompt.provider).toBe('openai');
    expect(prompt.version).toBe('2.3.0');
  });

  test('retrieves typographic analysis prompt for anthropic', () => {
    const prompt = getPrompt('anthropic', 'typographicAnalysis');
    expect(prompt).toBeInstanceOf(TypographicAnalysisPrompt);
    expect(prompt.provider).toBe('anthropic');
    expect(prompt.version).toBe('2.3.0');
  });

  test('throws error for unknown provider', () => {
    expect(() => {
      getPrompt('unknown', 'typographicAnalysis');
    }).toThrow('No typographic analysis template found for provider: unknown');
  });

  test('throws error for unknown template name', () => {
    // This goes through the general promptManager path which might throw different errors depending on implementation
    // But getPrompt wrapper usually handles specific known types first.
    // If we ask for something not in the hardcoded lists:
    expect(() => {
      getPrompt('openai', 'nonExistentTemplate');
    }).toThrow();
  });
});
