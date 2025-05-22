const {
  getProviderConfig,
  detectProvider,
  SUPPORTED_PROVIDERS
} = require('../index');

describe('Provider Exports', () => {
  describe('SUPPORTED_PROVIDERS', () => {
    it('should export supported provider constants', () => {
      expect(SUPPORTED_PROVIDERS).toEqual({
        OPENAI: 'openai',
        ANTHROPIC: 'anthropic'
      });
    });
  });

  describe('getProviderConfig', () => {
    it('should return OpenAI config for OpenAI provider', () => {
      const config = getProviderConfig(SUPPORTED_PROVIDERS.OPENAI);
      expect(config).toBeDefined();
      expect(config.name).toBe('openai');
      expect(config.systemPromptTemplate).toBeDefined();
      expect(config.formatSystemPrompt({ task: 'test' })).toContain('test');
    });

    it('should return Anthropic config for Anthropic provider', () => {
      const config = getProviderConfig(SUPPORTED_PROVIDERS.ANTHROPIC);
      expect(config).toBeDefined();
      expect(config.name).toBe('anthropic');
      expect(config.systemPromptTemplate).toBeDefined();
      expect(config.formatSystemPrompt({ task: 'test' })).toContain('test');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => getProviderConfig('unsupported')).toThrow('Unsupported provider: unsupported');
    });
  });

  describe('detectProvider', () => {
    it('should detect OpenAI from model name', () => {
      expect(detectProvider('gpt-4')).toBe(SUPPORTED_PROVIDERS.OPENAI);
      expect(detectProvider('gpt-3.5-turbo')).toBe(SUPPORTED_PROVIDERS.OPENAI);
    });

    it('should detect Anthropic from model name', () => {
      expect(detectProvider('claude-3-opus')).toBe(SUPPORTED_PROVIDERS.ANTHROPIC);
      expect(detectProvider('claude-3-sonnet')).toBe(SUPPORTED_PROVIDERS.ANTHROPIC);
    });

    it('should throw error for unknown model', () => {
      expect(() => detectProvider('unknown-model')).toThrow('Unable to detect provider for model: unknown-model');
    });

    it('should handle undefined/null model names', () => {
      expect(() => detectProvider()).toThrow('Model name is required');
      expect(() => detectProvider(null)).toThrow('Model name is required');
    });
  });
}); 