const OpenAIConfig = require('../../../src/utils/prompts/providers/openaiConfig');
const { ProviderConfig, PROVIDER_TYPES } = require('../../../src/utils/prompts/providers/providerConfig');

describe('OpenAIConfig', () => {
  describe('constructor', () => {
    it('should create a valid OpenAI configuration', () => {
      const config = new OpenAIConfig();
      expect(config).toBeInstanceOf(ProviderConfig);
      expect(config.name).toBe('openai');
      expect(config.type).toBe(PROVIDER_TYPES.OPENAI);
      expect(config.model).toBe('gpt-4-vision-preview');
    });

    it('should accept custom model', () => {
      const config = new OpenAIConfig({
        model: 'gpt-4-1106-vision-preview'
      });
      expect(config.model).toBe('gpt-4-1106-vision-preview');
    });

    it('should throw error for unsupported model', () => {
      expect(() => new OpenAIConfig({
        model: 'unsupported-model'
      })).toThrow('Unsupported OpenAI model');
    });
  });

  describe('getApiParams', () => {
    it('should return valid API parameters', () => {
      const config = new OpenAIConfig({
        maxTokens: 1000,
        temperature: 0.5
      });

      const params = config.getApiParams();
      expect(params).toEqual({
        model: 'gpt-4-vision-preview',
        max_tokens: 1000,
        temperature: 0.5,
        response_format: { type: 'json' }
      });
    });
  });
}); 