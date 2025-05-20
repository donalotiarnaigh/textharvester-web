const { promptManager, openaiTemplate, anthropicTemplate } = require('../providerTemplates');
const BasePrompt = require('../../BasePrompt');

// Test prompt class
class TestPrompt extends BasePrompt {
  constructor(config = {}) {
    super({
      version: '1.0.0',
      description: 'Test prompt',
      typeDefinitions: {
        id: 'integer',
        name: 'string',
        active: 'boolean',
        created: 'date',
        tags: 'array'
      },
      ...config
    });
  }

  getPromptText() {
    return 'Extract the following fields from the data';
  }
}

describe('Provider Templates', () => {
  let testPrompt;

  beforeEach(() => {
    testPrompt = new TestPrompt();
  });

  describe('OpenAI Template', () => {
    it('should have correct provider name', () => {
      expect(openaiTemplate.provider).toBe('openai');
    });

    it('should format prompt correctly', () => {
      const mockPrompt = {
        typeDefinitions: {
          id: 'integer',
          name: 'string',
          active: 'boolean',
          created: 'date',
          tags: 'array'
        },
        getPromptText: () => 'Extract the following fields from the data'
      };

      const formatted = promptManager.formatPrompt(mockPrompt, 'openai');

      expect(formatted.prompt).toContain('id: number');
      expect(formatted.prompt).toContain('name: string');
      expect(formatted.prompt).toContain('response_format: { type: "json_object" }');
    });
  });

  describe('Anthropic Template', () => {
    it('should have correct provider name', () => {
      expect(anthropicTemplate.provider).toBe('anthropic');
    });

    it('should format prompt correctly', () => {
      const mockPrompt = {
        typeDefinitions: {
          id: 'integer',
          name: 'string',
          active: 'boolean',
          created: 'date',
          tags: 'array'
        },
        getPromptText: () => 'Extract the following fields from the data'
      };

      const formatted = promptManager.formatPrompt(mockPrompt, 'anthropic');

      expect(formatted.prompt).toContain('id: numeric');
      expect(formatted.prompt).toContain('name: text');
      expect(formatted.prompt).toContain('must be a number, not text');
    });
  });

  describe('Template Validation', () => {
    it('should validate test prompt against OpenAI template', () => {
      const result = promptManager.validatePrompt(testPrompt, 'openai');
      expect(result.isValid).toBe(true);
    });

    it('should validate test prompt against Anthropic template', () => {
      const result = promptManager.validatePrompt(testPrompt, 'anthropic');
      expect(result.isValid).toBe(true);
    });
  });
}); 