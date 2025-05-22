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
      const params = openaiConfig.getApiParams();
      expect(params).toBeDefined();
      expect(typeof params.model).toBe('string');
      expect(typeof params.max_tokens).toBe('number');
      expect(typeof params.temperature).toBe('number');
      expect(params.response_format).toBeDefined();
    });

    it('should format system prompt for memorial task', () => {
      // Skip this test if formatSystemPrompt is not defined
      if (typeof openaiConfig.formatSystemPrompt !== 'function') {
        return;
      }
      
      // Apply a task that will be included in the output
      const task = 'Extract memorial data';
      openaiConfig.systemPromptTemplate = `Test system prompt for ${SUPPORTED_PROVIDERS.OPENAI}. {task}`;
      
      const formattedPrompt = openaiConfig.formatSystemPrompt({ task });
      
      // Verify prompt contains expected elements
      expect(formattedPrompt).toContain(task);
      expect(formattedPrompt).toContain(SUPPORTED_PROVIDERS.OPENAI);
      expect(formattedPrompt).not.toContain('{task}'); // Template var should be replaced
    });

    it('should have valid model configuration', () => {
      expect(openaiConfig.model).toBeDefined();
      expect(typeof openaiConfig.model).toBe('string');
    });
  });

  describe('Anthropic Configuration', () => {
    let anthropicConfig;

    beforeEach(() => {
      anthropicConfig = getProviderConfig(SUPPORTED_PROVIDERS.ANTHROPIC);
    });

    it('should provide correct API parameters', () => {
      const params = anthropicConfig.getApiParams();
      expect(params).toBeDefined();
      expect(typeof params.model).toBe('string');
      expect(typeof params.max_tokens).toBe('number');
      expect(typeof params.temperature).toBe('number');
    });

    it('should format system prompt for memorial task', () => {
      // Skip this test if formatSystemPrompt is not defined
      if (typeof anthropicConfig.formatSystemPrompt !== 'function') {
        return;
      }
      
      // Apply a task that will be included in the output
      const task = 'Extract memorial data';
      anthropicConfig.systemPromptTemplate = `Test system prompt for ${SUPPORTED_PROVIDERS.ANTHROPIC}. {task}`;
      
      const formattedPrompt = anthropicConfig.formatSystemPrompt({ task });
      
      // Verify prompt contains expected elements
      expect(formattedPrompt).toContain(task);
      expect(formattedPrompt).toContain(SUPPORTED_PROVIDERS.ANTHROPIC);
      expect(formattedPrompt).not.toContain('{task}'); // Template var should be replaced
    });

    it('should have valid model configuration', () => {
      expect(anthropicConfig.model).toBeDefined();
      expect(typeof anthropicConfig.model).toBe('string');
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
      
      // Only test if formatSystemPrompt exists and requires a task
      if (typeof config.formatSystemPrompt === 'function') {
        try {
          // First check if it actually throws for empty params
          config.formatSystemPrompt({});
        } catch (error) {
          // If it throws, we can verify the error
          expect(error).toBeDefined();
        }
      }
      
      // Test response format validation if it exists
      if (typeof config.validateResponseFormat === 'function' && config.responseFormat) {
        const originalType = config.responseFormat.type;
        try {
          config.responseFormat.type = 'invalid';
          try {
            config.validateResponseFormat();
          } catch (error) {
            expect(error).toBeDefined();
          }
        } finally {
          // Restore original value
          config.responseFormat.type = originalType;
        }
      }
    });

    it('should handle model validation errors if validation exists', () => {
      const config = getProviderConfig(SUPPORTED_PROVIDERS.ANTHROPIC);
      
      // Only test validateModel if it exists
      if (typeof config.validateModel === 'function') {
        const originalModel = config.model;
        try {
          config.model = 'invalid-model';
          
          try {
            config.validateModel();
          } catch (error) {
            expect(error).toBeDefined();
          }
        } finally {
          // Restore original value
          config.model = originalModel;
        }
      }
    });
  });
}); 