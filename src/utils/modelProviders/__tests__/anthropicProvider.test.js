const AnthropicProvider = require('../anthropicProvider');
const BaseVisionProvider = require('../baseProvider');

// Mock Anthropic client
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn()
    }
  }));
});

describe('AnthropicProvider', () => {
  let provider;
  let mockConfig;
  let mockAnthropicResponse;

  beforeEach(() => {
    mockConfig = {
      ANTHROPIC_API_KEY: 'test-key',
      ANTHROPIC_MODEL: 'claude-4-sonnet-20250514',
      MAX_TOKENS: 4000,
      TEMPERATURE: 0.2
    };
    
    mockAnthropicResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            memorial_number: '123',
            first_name: 'John',
            last_name: 'Doe',
            year_of_death: 1923,
            inscription: 'Test inscription'
          })
        }
      ]
    };

    provider = new AnthropicProvider(mockConfig);
    provider.client.messages.create.mockReset();
    provider.client.messages.create.mockResolvedValue(mockAnthropicResponse);
  });

  describe('constructor', () => {
    it('should extend BaseVisionProvider', () => {
      expect(provider).toBeInstanceOf(BaseVisionProvider);
    });

    it('should initialize with provided API key', () => {
      expect(provider.client).toBeDefined();
    });

    it('should use environment variable if no API key in config', () => {
      process.env.ANTHROPIC_API_KEY = 'env-test-key';
      const envProvider = new AnthropicProvider({});
      expect(envProvider.client).toBeDefined();
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should use provided model from config', () => {
      expect(provider.model).toBe('claude-4-sonnet-20250514');
    });

    it('should use default model if not specified', () => {
      const defaultProvider = new AnthropicProvider({});
      expect(defaultProvider.model).toBe('claude-4-sonnet-20250514');
    });

    it('should use provided max tokens from config', () => {
      expect(provider.maxTokens).toBe(4000);
    });

    it('should use default max tokens if not specified', () => {
      const defaultProvider = new AnthropicProvider({});
      expect(defaultProvider.maxTokens).toBe(8000);
    });

    it('should use provided temperature from config', () => {
      expect(provider.temperature).toBe(0.2);
    });

    it('should use default temperature if not specified', () => {
      const defaultProvider = new AnthropicProvider({});
      expect(defaultProvider.temperature).toBe(0);
    });
  });

  describe('getModelVersion', () => {
    it('should return current model version', () => {
      expect(provider.getModelVersion()).toBe('claude-4-sonnet-20250514');
    });
  });

  describe('processImage', () => {
    const testImage = 'base64-image-data';
    const testPrompt = 'Test prompt';

    it('should call Anthropic API with correct parameters', async () => {
      await provider.processImage(testImage, testPrompt);
      
      expect(provider.client.messages.create).toHaveBeenCalledWith({
        model: 'claude-4-sonnet-20250514',
        max_tokens: 4000,
        temperature: 0.2,
        system: 'Return a JSON object with the extracted text details.',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: testPrompt },
              { 
                type: 'image', 
                source: { 
                  type: 'base64', 
                  media_type: 'image/jpeg', 
                  data: testImage 
                } 
              }
            ]
          }
        ]
      });
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
      expect(result).toBe(mockAnthropicResponse.content[0].text);
    });

    it('should handle API errors', async () => {
      const errorMessage = 'API Error';
      provider.client.messages.create.mockRejectedValue(new Error(errorMessage));
      
      await expect(provider.processImage(testImage, testPrompt))
        .rejects
        .toThrow(`Anthropic processing failed: ${errorMessage}`);
    });

    it('should handle missing text content in response', async () => {
      provider.client.messages.create.mockResolvedValue({
        content: [{ type: 'other' }]
      });
      
      await expect(provider.processImage(testImage, testPrompt))
        .rejects
        .toThrow('No text content in response');
    });

    it('should handle invalid JSON response', async () => {
      provider.client.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Invalid JSON' }]
      });
      
      await expect(provider.processImage(testImage, testPrompt))
        .rejects
        .toThrow('Failed to parse JSON response: Invalid JSON: Unexpected token');
    });

    it('should handle JSON response in code block', async () => {
      const jsonInCodeBlock = '```json\n{"memorial_number":"123"}\n```';
      provider.client.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: jsonInCodeBlock }]
      });
      
      const result = await provider.processImage(testImage, testPrompt);
      expect(result).toEqual({ memorial_number: '123' });
    });
  });

  describe('validateConfig', () => {
    it('should pass with valid configuration', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should throw error if client is not initialized', () => {
      provider.client = null;
      expect(() => provider.validateConfig())
        .toThrow('Anthropic client not initialized. Check API key configuration.');
    });

    it('should throw error if model is not vision-capable', () => {
      provider.model = 'claude-3-opus';
      expect(() => provider.validateConfig())
        .toThrow('Invalid model specified. Must be a vision-capable model.');
    });
  });
}); 