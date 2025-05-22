const BasePrompt = require('../BasePrompt');
const { PROVIDER_TYPES, createProviderConfig } = require('../providers/providerConfig');
const dataTypes = require('../types/dataTypes');

describe('BasePrompt', () => {
  describe('constructor', () => {
    it('should initialize with default values when no config provided', () => {
      const prompt = new BasePrompt();
      expect(prompt.version).toBe('1.0.0');
      expect(prompt.description).toBe('');
      expect(prompt.fields).toEqual({});
      expect(prompt.providers).toEqual(['openai', 'anthropic']);
    });

    it('should initialize with provided config values', () => {
      const config = {
        version: '2.0.0',
        description: 'Test prompt',
        fields: {
          name: { type: 'string', description: 'Full name' },
          age: { type: 'integer', description: 'Age in years' }
        },
        providers: ['openai']
      };
      const prompt = new BasePrompt(config);
      expect(prompt.version).toBe('2.0.0');
      expect(prompt.description).toBe('Test prompt');
      expect(prompt.fields).toEqual(config.fields);
      expect(prompt.providers).toEqual(['openai']);
    });

    it('should validate field types against supported types', () => {
      expect(() => {
        new BasePrompt({
          fields: {
            test: { type: 'unsupported_type', description: 'Test field' }
          }
        });
      }).toThrow('Unsupported field type: unsupported_type');
    });
  });

  describe('field validation', () => {
    let prompt;

    beforeEach(() => {
      prompt = new BasePrompt({
        fields: {
          name: { type: 'string', description: 'Full name' },
          age: { type: 'integer', description: 'Age in years' },
          active: { type: 'boolean', description: 'Is active' },
          score: { type: 'float', description: 'Test score' },
          birthdate: { type: 'date', description: 'Date of birth' }
        }
      });
    });

    it('should validate and convert string fields', () => {
      const result = prompt.validateField('name', 'John Doe');
      expect(result).toBe('John Doe');
    });

    it('should validate and convert integer fields', () => {
      expect(prompt.validateField('age', '25')).toBe(25);
      expect(prompt.validateField('age', 25)).toBe(25);
      expect(prompt.validateField('age', 'invalid')).toBeNull();
    });

    it('should validate and convert boolean fields', () => {
      expect(prompt.validateField('active', true)).toBe(true);
      expect(prompt.validateField('active', 'true')).toBe(true);
      expect(prompt.validateField('active', 'false')).toBe(false);
      expect(prompt.validateField('active', 'invalid')).toBe(false);
    });

    it('should validate and convert float fields', () => {
      expect(prompt.validateField('score', '92.5')).toBe(92.5);
      expect(prompt.validateField('score', 92.5)).toBe(92.5);
      expect(prompt.validateField('score', 'invalid')).toBeNull();
    });

    it('should validate and convert date fields', () => {
      const date = new Date('2024-03-22');
      expect(prompt.validateField('birthdate', '2024-03-22')).toEqual(date);
      expect(prompt.validateField('birthdate', date)).toEqual(date);
      expect(prompt.validateField('birthdate', 'invalid')).toBeNull();
    });

    it('should handle null and undefined values', () => {
      expect(prompt.validateField('name', null)).toBeNull();
      expect(prompt.validateField('age', undefined)).toBeNull();
    });
  });

  describe('provider integration', () => {
    let prompt;

    beforeEach(() => {
      prompt = new BasePrompt({
        fields: {
          name: { type: 'string', description: 'Full name' },
          age: { type: 'integer', description: 'Age in years' }
        }
      });
      prompt.getPromptText = jest.fn().mockReturnValue('Extract the following fields from the data');
    });

    it('should format prompt for specific provider', () => {
      const formatted = prompt.getProviderPrompt('openai');
      expect(formatted).toHaveProperty('systemPrompt');
      expect(formatted).toHaveProperty('userPrompt');
      expect(formatted.systemPrompt).toContain('OpenAI');
    });

    it('should include field descriptions in provider prompt', () => {
      const formatted = prompt.getProviderPrompt('openai');
      expect(formatted.userPrompt).toContain('Full name');
      expect(formatted.userPrompt).toContain('Age in years');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        prompt.getProviderPrompt('unsupported');
      }).toThrow('Provider not supported: unsupported');
    });

    it('should validate provider configuration', () => {
      expect(() => {
        prompt.validateProvider('invalid');
      }).toThrow('Provider not supported: invalid');
      
      expect(() => {
        prompt.validateProvider('openai');
      }).not.toThrow();
    });
  });

  describe('data validation', () => {
    let prompt;

    beforeEach(() => {
      prompt = new BasePrompt({
        fields: {
          name: { type: 'string', description: 'Full name' },
          age: { type: 'integer', description: 'Age in years' }
        }
      });
    });

    it('should validate and convert complete data object', () => {
      const data = {
        name: 'John Doe',
        age: '25'
      };
      const result = prompt.validateAndConvert(data);
      expect(result).toEqual({
        name: 'John Doe',
        age: 25
      });
    });

    it('should handle missing fields', () => {
      const data = {
        name: 'John Doe'
      };
      const result = prompt.validateAndConvert(data);
      expect(result).toEqual({
        name: 'John Doe',
        age: null
      });
    });

    it('should handle invalid data', () => {
      const data = {
        name: 'John Doe',
        age: 'invalid'
      };
      const result = prompt.validateAndConvert(data);
      expect(result).toEqual({
        name: 'John Doe',
        age: null
      });
    });
  });

  describe('enhanced provider integration', () => {
    let prompt;

    beforeEach(() => {
      prompt = new BasePrompt({
        fields: {
          name: { type: 'string', description: 'Full name' },
          age: { type: 'integer', description: 'Age in years' }
        }
      });
      prompt.getPromptText = jest.fn().mockReturnValue('Extract the following fields from the data');
    });

    it('should get provider-specific field formatting', () => {
      const openaiFields = prompt.getProviderFields('openai');
      expect(openaiFields).toEqual({
        name: { type: 'string', description: 'Full name', format: 'text' },
        age: { type: 'integer', description: 'Age in years', format: 'integer' }
      });

      const anthropicFields = prompt.getProviderFields('anthropic');
      expect(anthropicFields).toEqual({
        name: { type: 'string', description: 'Full name', format: 'text' },
        age: { type: 'integer', description: 'Age in years', format: 'number' }
      });
    });

    it('should format response for specific provider', () => {
      const openaiResponse = prompt.formatProviderResponse('openai', {
        name: 'John Doe',
        age: 25
      });
      expect(openaiResponse).toEqual({
        response_format: { type: 'json' },
        content: {
          name: 'John Doe',
          age: 25
        }
      });

      const anthropicResponse = prompt.formatProviderResponse('anthropic', {
        name: 'John Doe',
        age: 25
      });
      expect(anthropicResponse).toEqual({
        messages: [{
          role: 'assistant',
          content: JSON.stringify({
            name: 'John Doe',
            age: 25
          }, null, 2)
        }]
      });
    });

    it('should get provider-specific validation rules', () => {
      const openaiRules = prompt.getProviderValidationRules('openai');
      expect(openaiRules).toEqual({
        maxTokens: 2000,
        temperature: 0.7,
        responseFormat: { type: 'json' }
      });

      const anthropicRules = prompt.getProviderValidationRules('anthropic');
      expect(anthropicRules).toEqual({
        maxTokens: 2000,
        temperature: 0.7,
        format: 'json'
      });
    });

    it('should validate provider-specific response format', () => {
      // Valid OpenAI response
      expect(() => {
        prompt.validateProviderResponse('openai', {
          response_format: { type: 'json' },
          content: { name: 'John', age: 25 }
        });
      }).not.toThrow();

      // Invalid OpenAI response
      expect(() => {
        prompt.validateProviderResponse('openai', {
          content: { name: 'John', age: 25 }
        });
      }).toThrow('Invalid OpenAI response format');

      // Valid Anthropic response
      expect(() => {
        prompt.validateProviderResponse('anthropic', {
          messages: [{
            role: 'assistant',
            content: '{"name": "John", "age": 25}'
          }]
        });
      }).not.toThrow();

      // Invalid Anthropic response
      expect(() => {
        prompt.validateProviderResponse('anthropic', {
          content: '{"name": "John", "age": 25}'
        });
      }).toThrow('Invalid Anthropic response format');
    });

    it('should handle provider-specific error cases', () => {
      // Test token limit exceeded
      expect(() => {
        prompt.validateProviderResponse('openai', {
          response_format: { type: 'json' },
          content: { error: 'token_limit_exceeded' }
        });
      }).toThrow('OpenAI token limit exceeded');

      // Test invalid JSON response
      expect(() => {
        prompt.validateProviderResponse('anthropic', {
          messages: [{
            role: 'assistant',
            content: 'Invalid JSON'
          }]
        });
      }).toThrow('Invalid JSON in Anthropic response');
    });
  });
}); 