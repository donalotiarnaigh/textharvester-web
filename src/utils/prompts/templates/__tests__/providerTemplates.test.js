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
    it('should have all required fields', () => {
      expect(openaiTemplate.provider).toBe('openai');
      expect(openaiTemplate.systemPrompt).toBeDefined();
      expect(openaiTemplate.formatInstructions).toBeDefined();
      expect(openaiTemplate.typeFormatting).toBeDefined();
    });

    it('should support all basic types', () => {
      const types = ['integer', 'float', 'string', 'boolean', 'date', 'array'];
      types.forEach(type => {
        expect(openaiTemplate.typeFormatting[type]).toBeDefined();
      });
    });

    it('should format prompt correctly', () => {
      const formatted = promptManager.formatPrompt(testPrompt, 'openai');
      
      expect(formatted.systemPrompt).toContain('You are an expert OCR system specializing in extracting structured data from memorial inscriptions');
      expect(formatted.prompt).toContain('Extract the following fields');
      expect(formatted.prompt).toContain('id: number');
      expect(formatted.prompt).toContain('name: string');
      expect(formatted.prompt).toContain('response_format: { type: "json_object" }');
    });
  });

  describe('Anthropic Template', () => {
    it('should have all required fields', () => {
      expect(anthropicTemplate.provider).toBe('anthropic');
      expect(anthropicTemplate.systemPrompt).toBeDefined();
      expect(anthropicTemplate.formatInstructions).toBeDefined();
      expect(anthropicTemplate.typeFormatting).toBeDefined();
    });

    it('should support all basic types', () => {
      const types = ['integer', 'float', 'string', 'boolean', 'date', 'array'];
      types.forEach(type => {
        expect(anthropicTemplate.typeFormatting[type]).toBeDefined();
      });
    });

    it('should format prompt correctly', () => {
      const formatted = promptManager.formatPrompt(testPrompt, 'anthropic');
      
      expect(formatted.systemPrompt).toContain('You are an expert OCR system specializing in extracting structured data from memorial inscriptions');
      expect(formatted.prompt).toContain('Extract the following fields');
      expect(formatted.prompt).toContain('id: numeric');
      expect(formatted.prompt).toContain('name: text');
      expect(formatted.prompt).toContain('Convert all numeric values to actual numbers');
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