const OpenAIProvider = require('../openaiProvider');
const BaseVisionProvider = require('../baseProvider');

// Mock OpenAI client
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

describe('OpenAIProvider', () => {
  let provider;
  let mockConfig;
  let mockOpenAIResponse;

  beforeEach(() => {
    mockConfig = {
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'gpt-4o',
      MAX_TOKENS: 4000,
      TEMPERATURE: 0.2
    };
    
    mockOpenAIResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            memorial_number: '123',
            first_name: 'John',
            last_name: 'Doe',
            year_of_death: 1923,
            inscription: 'Test inscription'
          })
        }
      }]
    };

    provider = new OpenAIProvider(mockConfig);
    provider.client.chat.completions.create.mockReset();
    provider.client.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
  });

  describe('constructor', () => {
    it('should extend BaseVisionProvider', () => {
      expect(provider).toBeInstanceOf(BaseVisionProvider);
    });

    it('should initialize with provided API key', () => {
      expect(provider.client).toBeDefined();
    });

    it('should use environment variable if no API key in config', () => {
      process.env.OPENAI_API_KEY = 'env-test-key';
      const envProvider = new OpenAIProvider({});
      expect(envProvider.client).toBeDefined();
      delete process.env.OPENAI_API_KEY;
    });

    it('should use provided model from config', () => {
      expect(provider.model).toBe('gpt-4o');
    });

    it('should use default model if not specified', () => {
      const defaultProvider = new OpenAIProvider({});
      expect(defaultProvider.model).toBe('gpt-4o');
    });

    it('should use provided max tokens from config', () => {
      expect(provider.maxTokens).toBe(4000);
    });

    it('should use default max tokens if not specified', () => {
      const defaultProvider = new OpenAIProvider({});
      expect(defaultProvider.maxTokens).toBe(4000);
    });

    it('should use provided temperature from config', () => {
      expect(provider.temperature).toBe(0.2);
    });

    it('should use default temperature if not specified', () => {
      const defaultProvider = new OpenAIProvider({});
      expect(defaultProvider.temperature).toBe(0);
    });

    it('should read reasoningEffort from config', () => {
      const configWithReasoning = {
        ...mockConfig,
        openAI: { reasoningEffort: 'low' }
      };
      const providerWithReasoning = new OpenAIProvider(configWithReasoning);
      expect(providerWithReasoning.reasoningEffort).toBe('low');
    });

    it('should auto-detect GPT-5 models and set reasoningEffort to none', () => {
      const gpt5Config = {
        ...mockConfig,
        OPENAI_MODEL: 'gpt-5.1'
      };
      const gpt5Provider = new OpenAIProvider(gpt5Config);
      expect(gpt5Provider.reasoningEffort).toBe('none');
    });

    it('should not override explicit reasoningEffort for GPT-5 models', () => {
      const gpt5Config = {
        ...mockConfig,
        OPENAI_MODEL: 'gpt-5.1',
        openAI: { reasoningEffort: 'low' }
      };
      const gpt5Provider = new OpenAIProvider(gpt5Config);
      expect(gpt5Provider.reasoningEffort).toBe('low');
    });

    it('should not set reasoningEffort for GPT-4o models', () => {
      expect(provider.reasoningEffort).toBeNull();
    });
  });

  describe('getModelVersion', () => {
    it('should return current model version', () => {
      expect(provider.getModelVersion()).toBe('gpt-4o');
    });
  });

  describe('processImage', () => {
    const testImage = 'base64-image-data';
    const testPrompt = 'Test prompt';

    it('should call OpenAI API with correct parameters', async () => {
      await provider.processImage(testImage, testPrompt);
      
      expect(provider.client.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Return a JSON object with the extracted text details.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: testPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${testImage}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 4000,
        temperature: 0.2
      });
    });

    it('should include reasoning parameter for GPT-5.1 model', async () => {
      const gpt5Config = {
        ...mockConfig,
        OPENAI_MODEL: 'gpt-5.1'
      };
      const gpt5Provider = new OpenAIProvider(gpt5Config);
      gpt5Provider.client.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
      
      await gpt5Provider.processImage(testImage, testPrompt);
      
      expect(gpt5Provider.client.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5.1',
          reasoning: {
            effort: 'none'
          }
        })
      );
    });

    it('should not include reasoning parameter for GPT-4o model', async () => {
      await provider.processImage(testImage, testPrompt);
      
      const callArgs = provider.client.chat.completions.create.mock.calls[0][0];
      expect(callArgs.reasoning).toBeUndefined();
    });

    it('should return parsed JSON response', async () => {
      const result = await provider.processImage(testImage, testPrompt);
      expect(result).toEqual({
        memorial_number: '123',
        first_name: 'John',
        last_name: 'Doe',
        year_of_death: 1923,
        inscription: 'Test inscription'
      });
    });

    it('should return raw response when raw option is true', async () => {
      const result = await provider.processImage(testImage, testPrompt, { raw: true });
      expect(result).toBe(mockOpenAIResponse.choices[0].message.content);
    });

    it('should handle API errors', async () => {
      const errorMessage = 'API Error';
      provider.client.chat.completions.create.mockRejectedValue(new Error(errorMessage));
      
      await expect(provider.processImage(testImage, testPrompt))
        .rejects
        .toThrow(`OpenAI processing failed: ${errorMessage}`);
    });

    it('should handle invalid JSON response', async () => {
      provider.client.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Invalid JSON'
          }
        }]
      });
      
      await expect(provider.processImage(testImage, testPrompt))
        .rejects
        .toThrow('OpenAI processing failed: Unexpected token');
    });
  });

  describe('validateConfig', () => {
    it('should pass with valid configuration', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should throw error if client is not initialized', () => {
      provider.client = null;
      expect(() => provider.validateConfig())
        .toThrow('OpenAI client not initialized. Check API key configuration.');
    });

    it('should accept GPT-4 models', () => {
      provider.model = 'gpt-4';
      expect(provider.validateConfig()).toBe(true);
    });

    it('should accept GPT-5 models', () => {
      provider.model = 'gpt-5.1';
      expect(provider.validateConfig()).toBe(true);
    });

    it('should accept GPT-4o models', () => {
      provider.model = 'gpt-4o';
      expect(provider.validateConfig()).toBe(true);
    });

    it('should throw error if model is not vision-capable', () => {
      provider.model = 'gpt-3.5-turbo';
      expect(() => provider.validateConfig())
        .toThrow('Invalid model specified. Must be a vision-capable model');
    });
  });
}); 