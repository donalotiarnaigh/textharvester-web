const {
  ProviderConfig,
  createProviderConfig,
  PROVIDER_TYPES
} = require('../../../src/utils/prompts/providers/providerConfig');

describe('Provider Configuration', () => {
  describe('ProviderConfig Class', () => {
    it('should create a valid provider configuration', () => {
      const config = new ProviderConfig({
        name: 'openai',
        type: PROVIDER_TYPES.OPENAI,
        maxTokens: 2000,
        temperature: 0.7,
        systemPromptTemplate: 'You are a helpful assistant that {task}.',
        responseFormat: {
          type: 'json',
          schema: {
            type: 'object',
            properties: {
              result: { type: 'string' }
            }
          }
        }
      });

      expect(config.name).toBe('openai');
      expect(config.type).toBe(PROVIDER_TYPES.OPENAI);
      expect(config.maxTokens).toBe(2000);
      expect(config.temperature).toBe(0.7);
      expect(config.systemPromptTemplate).toBe('You are a helpful assistant that {task}.');
      expect(config.responseFormat).toEqual({
        type: 'json',
        schema: {
          type: 'object',
          properties: {
            result: { type: 'string' }
          }
        }
      });
    });

    it('should validate required fields', () => {
      expect(() => new ProviderConfig({
        // Missing name and type
        maxTokens: 2000
      })).toThrow('Provider name is required');

      expect(() => new ProviderConfig({
        name: 'openai'
        // Missing type
      })).toThrow('Provider type is required');
    });

    it('should enforce valid provider types', () => {
      expect(() => new ProviderConfig({
        name: 'openai',
        type: 'invalid_type'
      })).toThrow('Invalid provider type');
    });

    it('should set default values for optional fields', () => {
      const config = new ProviderConfig({
        name: 'openai',
        type: PROVIDER_TYPES.OPENAI
      });

      expect(config.maxTokens).toBeDefined();
      expect(config.temperature).toBeDefined();
      expect(config.systemPromptTemplate).toBeDefined();
    });
  });

  describe('Provider Configuration Factory', () => {
    it('should create OpenAI configuration', () => {
      const config = createProviderConfig('openai');
      
      expect(config.name).toBe('openai');
      expect(config.type).toBe(PROVIDER_TYPES.OPENAI);
      expect(config.systemPromptTemplate).toContain('You are an AI assistant');
      expect(config.responseFormat).toBeDefined();
    });

    it('should create Anthropic configuration', () => {
      const config = createProviderConfig('anthropic');
      
      expect(config.name).toBe('anthropic');
      expect(config.type).toBe(PROVIDER_TYPES.ANTHROPIC);
      expect(config.systemPromptTemplate).toContain('You are Claude');
      expect(config.responseFormat).toBeDefined();
    });

    it('should throw error for unknown provider', () => {
      expect(() => createProviderConfig('unknown')).toThrow('Unknown provider: unknown');
    });
  });

  describe('System Prompts', () => {
    it('should format system prompt with task', () => {
      const config = createProviderConfig('openai');
      const formattedPrompt = config.formatSystemPrompt({ task: 'process memorial records' });
      
      expect(formattedPrompt).toContain('process memorial records');
    });

    it('should handle missing task parameter', () => {
      const config = createProviderConfig('openai');
      expect(() => config.formatSystemPrompt({})).toThrow('Task is required');
    });
  });

  describe('Response Format', () => {
    it('should reject invalid response format type during construction', () => {
      expect(() => new ProviderConfig({
        name: 'openai',
        type: PROVIDER_TYPES.OPENAI,
        responseFormat: {
          type: 'invalid'
        }
      })).toThrow('Invalid response format type');
    });

    it('should reject JSON format without schema during construction', () => {
      expect(() => new ProviderConfig({
        name: 'openai',
        type: PROVIDER_TYPES.OPENAI,
        responseFormat: {
          type: 'json'
          // Missing schema
        }
      })).toThrow('Schema is required for JSON response format');
    });

    it('should accept valid text format', () => {
      const config = new ProviderConfig({
        name: 'openai',
        type: PROVIDER_TYPES.OPENAI,
        responseFormat: {
          type: 'text'
        }
      });
      expect(config.responseFormat.type).toBe('text');
    });

    it('should accept valid markdown format', () => {
      const config = new ProviderConfig({
        name: 'openai',
        type: PROVIDER_TYPES.OPENAI,
        responseFormat: {
          type: 'markdown'
        }
      });
      expect(config.responseFormat.type).toBe('markdown');
    });
  });
}); 