const AnthropicConfig = require('../../../src/utils/prompts/providers/anthropicConfig');
const { ProviderConfig, PROVIDER_TYPES } = require('../../../src/utils/prompts/providers/providerConfig');

describe('AnthropicConfig', () => {
  describe('constructor', () => {
    it('should create a valid Anthropic configuration', () => {
      const config = new AnthropicConfig();
      expect(config).toBeInstanceOf(ProviderConfig);
      expect(config.name).toBe('anthropic');
      expect(config.type).toBe(PROVIDER_TYPES.ANTHROPIC);
      expect(config.model).toBe('claude-3-sonnet-20240229');
    });

    it('should accept custom model', () => {
      const config = new AnthropicConfig({
        model: 'claude-3-haiku-20240307'
      });
      expect(config.model).toBe('claude-3-haiku-20240307');
    });

    it('should throw error for unsupported model', () => {
      expect(() => new AnthropicConfig({
        model: 'unsupported-model'
      })).toThrow('Unsupported Anthropic model');
    });
  });

  describe('getApiParams', () => {
    it('should return valid API parameters', () => {
      const config = new AnthropicConfig({
        maxTokens: 1000,
        temperature: 0.5
      });

      const params = config.getApiParams();
      expect(params).toEqual({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        temperature: 0.5,
        messages: []
      });
    });
  });

  describe('formatSystemPrompt', () => {
    it('should format system prompt with JSON instructions', () => {
      const config = new AnthropicConfig();
      const prompt = config.formatSystemPrompt({ task: 'process data' });
      
      expect(prompt).toContain('process data');
      expect(prompt).toContain('format your response as a JSON object');
      expect(prompt).toContain('Do not include any explanations or markdown formatting');
    });

    it('should throw error when task is missing', () => {
      const config = new AnthropicConfig();
      expect(() => config.formatSystemPrompt({})).toThrow('Task is required');
    });
  });
}); 