const ProviderPromptManager = require('../ProviderPromptManager');
const BasePrompt = require('../BasePrompt');

// Mock prompt class for testing
class TestPrompt extends BasePrompt {
  constructor(config = {}) {
    super({
      version: '1.0.0',
      description: 'Test prompt',
      typeDefinitions: {
        field1: 'string',
        field2: 'integer'
      },
      ...config
    });
  }

  getPromptText() {
    return 'Base prompt text';
  }
}

describe('ProviderPromptManager', () => {
  let promptManager;
  let mockPrompt;

  beforeEach(() => {
    mockPrompt = new TestPrompt();
    promptManager = new ProviderPromptManager();
  });

  describe('registerPromptTemplate', () => {
    it('should register a provider-specific template', () => {
      const template = {
        provider: 'openai',
        systemPrompt: 'OpenAI specific system prompt',
        formatInstructions: 'Use JSON format with response_format: { type: "json_object" }',
        typeFormatting: {
          integer: 'number',
          float: 'number',
          string: 'string',
          boolean: 'boolean'
        }
      };

      promptManager.registerPromptTemplate('openai', template);
      expect(promptManager.getTemplate('openai')).toBe(template);
    });

    it('should throw error for invalid template structure', () => {
      const invalidTemplate = {
        provider: 'openai'
        // Missing required fields
      };

      expect(() => {
        promptManager.registerPromptTemplate('openai', invalidTemplate);
      }).toThrow('Invalid template structure');
    });

    it('should throw error if provider name does not match template', () => {
      const template = {
        provider: 'anthropic',
        systemPrompt: 'Test',
        formatInstructions: 'Test',
        typeFormatting: {}
      };

      expect(() => {
        promptManager.registerPromptTemplate('openai', template);
      }).toThrow('Provider name mismatch');
    });
  });

  describe('formatPrompt', () => {
    beforeEach(() => {
      // Register test templates
      promptManager.registerPromptTemplate('openai', {
        provider: 'openai',
        systemPrompt: 'OpenAI system prompt',
        formatInstructions: 'Return as JSON object',
        typeFormatting: {
          integer: 'number',
          string: 'string'
        }
      });

      promptManager.registerPromptTemplate('anthropic', {
        provider: 'anthropic',
        systemPrompt: 'Anthropic system prompt',
        formatInstructions: 'Ensure numeric values are numbers not text',
        typeFormatting: {
          integer: 'numeric',
          string: 'text'
        }
      });
    });

    it('should format prompt for OpenAI', () => {
      const formatted = promptManager.formatPrompt(mockPrompt, 'openai');
      expect(formatted.systemPrompt).toBe('OpenAI system prompt');
      expect(formatted.prompt).toContain('Base prompt text');
      expect(formatted.prompt).toContain('Return as JSON object');
    });

    it('should format prompt for Anthropic', () => {
      const formatted = promptManager.formatPrompt(mockPrompt, 'anthropic');
      expect(formatted.systemPrompt).toBe('Anthropic system prompt');
      expect(formatted.prompt).toContain('Base prompt text');
      expect(formatted.prompt).toContain('Ensure numeric values are numbers not text');
    });

    it('should include type definitions in formatted prompt', () => {
      const formatted = promptManager.formatPrompt(mockPrompt, 'openai');
      expect(formatted.prompt).toContain('field1: string');
      expect(formatted.prompt).toContain('field2: number');
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        promptManager.formatPrompt(mockPrompt, 'unknown');
      }).toThrow('No template registered for provider: unknown');
    });
  });

  describe('validatePrompt', () => {
    it('should validate prompt against provider template', () => {
      promptManager.registerPromptTemplate('openai', {
        provider: 'openai',
        systemPrompt: 'Test',
        formatInstructions: 'Test',
        typeFormatting: {
          integer: 'number',
          string: 'string'
        }
      });

      const result = promptManager.validatePrompt(mockPrompt, 'openai');
      expect(result.isValid).toBe(true);
    });

    it('should fail validation if type is not supported', () => {
      promptManager.registerPromptTemplate('openai', {
        provider: 'openai',
        systemPrompt: 'Test',
        formatInstructions: 'Test',
        typeFormatting: {
          string: 'string'
          // integer not supported
        }
      });

      const result = promptManager.validatePrompt(mockPrompt, 'openai');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Type "integer" not supported by provider openai');
    });
  });
}); 