const {
  getProviderConfig,
  detectProvider,
  SUPPORTED_PROVIDERS
} = require('../index');

describe('Provider Configuration Integration', () => {
  describe('OpenAI Configuration', () => {
    let openaiConfig;

    beforeEach(() => {
      openaiConfig = getProviderConfig(SUPPORTED_PROVIDERS.OPENAI);
    });

    it('should provide correct API parameters for vision model', () => {
      expect(openaiConfig.getApiParams()).toEqual({
        model: 'gpt-4-vision-preview',
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: 'json' }
      });
    });

    it('should format system prompt with memorial task', () => {
      const task = 'Extract the following fields from the memorial record: memorial_number, first_name, last_name, year_of_death, and inscription';
      const formattedPrompt = openaiConfig.formatSystemPrompt({ task });
      
      // Verify prompt contains key elements
      expect(formattedPrompt).toContain('OpenAI');
      expect(formattedPrompt).toContain(task);
      expect(formattedPrompt).not.toContain('{task}'); // Template var should be replaced
    });

    it('should validate model configuration', () => {
      expect(() => {
        openaiConfig.model = 'unsupported-model';
        openaiConfig.validateModel();
      }).toThrow('Unsupported OpenAI model');
    });
  });

  describe('Anthropic Configuration', () => {
    let anthropicConfig;

    beforeEach(() => {
      anthropicConfig = getProviderConfig(SUPPORTED_PROVIDERS.ANTHROPIC);
    });

    it('should provide correct API parameters', () => {
      expect(anthropicConfig.getApiParams()).toEqual({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.7,
        messages: []
      });
    });

    it('should format system prompt with memorial task', () => {
      const task = 'Extract the following fields from the memorial record: memorial_number, first_name, last_name, year_of_death, and inscription';
      const formattedPrompt = anthropicConfig.formatSystemPrompt({ task });
      
      // Verify prompt contains key elements
      expect(formattedPrompt).toContain('Claude');
      expect(formattedPrompt).toContain(task);
      expect(formattedPrompt).toContain('JSON object'); // Anthropic-specific formatting
      expect(formattedPrompt).not.toContain('{task}'); // Template var should be replaced
    });

    it('should validate model configuration', () => {
      expect(() => {
        anthropicConfig.model = 'unsupported-model';
        anthropicConfig.validateModel();
      }).toThrow('Unsupported Anthropic model');
    });
  });

  describe('Provider Detection with Real Models', () => {
    const realModelScenarios = [
      { model: 'gpt-4-vision-preview', expected: SUPPORTED_PROVIDERS.OPENAI },
      { model: 'gpt-4-1106-vision-preview', expected: SUPPORTED_PROVIDERS.OPENAI },
      { model: 'claude-3-opus-20240229', expected: SUPPORTED_PROVIDERS.ANTHROPIC },
      { model: 'claude-3-sonnet-20240229', expected: SUPPORTED_PROVIDERS.ANTHROPIC },
      { model: 'claude-3-haiku-20240307', expected: SUPPORTED_PROVIDERS.ANTHROPIC }
    ];

    test.each(realModelScenarios)(
      'should detect correct provider for $model',
      ({ model, expected }) => {
        expect(detectProvider(model)).toBe(expected);
      }
    );
  });

  describe('Error Handling Scenarios', () => {
    it('should handle provider configuration errors gracefully', () => {
      const config = getProviderConfig(SUPPORTED_PROVIDERS.OPENAI);
      
      // Test missing task parameter
      expect(() => {
        config.formatSystemPrompt({});
      }).toThrow('Task is required');

      // Test invalid response format
      expect(() => {
        config.responseFormat.type = 'invalid';
        config.validateResponseFormat();
      }).toThrow('Invalid response format type');
    });

    it('should handle model validation errors properly', () => {
      const config = getProviderConfig(SUPPORTED_PROVIDERS.ANTHROPIC);
      config.model = 'invalid-model';
      
      expect(() => {
        config.validateModel();
      }).toThrow('Unsupported Anthropic model');
    });
  });
}); 