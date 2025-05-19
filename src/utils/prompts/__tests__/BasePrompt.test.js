const BasePrompt = require('../BasePrompt');

describe('BasePrompt', () => {
  describe('constructor', () => {
    it('should initialize with default values when no config provided', () => {
      const prompt = new BasePrompt();
      expect(prompt.version).toBe('1.0.0');
      expect(prompt.modelTargets).toEqual(['openai', 'anthropic']);
      expect(prompt.description).toBe('');
      expect(prompt.typeDefinitions).toEqual({});
    });

    it('should initialize with provided config values', () => {
      const config = {
        version: '2.0.0',
        modelTargets: ['openai'],
        description: 'Test prompt',
        typeDefinitions: {
          field1: 'string',
          field2: 'integer'
        }
      };
      const prompt = new BasePrompt(config);
      expect(prompt.version).toBe('2.0.0');
      expect(prompt.modelTargets).toEqual(['openai']);
      expect(prompt.description).toBe('Test prompt');
      expect(prompt.typeDefinitions).toEqual({
        field1: 'string',
        field2: 'integer'
      });
    });
  });

  describe('validateAndConvert', () => {
    it('should convert data types according to type definitions', () => {
      const prompt = new BasePrompt({
        typeDefinitions: {
          stringField: 'string',
          integerField: 'integer',
          floatField: 'float',
          booleanField: 'boolean',
          dateField: 'date'
        }
      });

      const testData = {
        stringField: 'test',
        integerField: '42',
        floatField: '3.14',
        booleanField: 'true',
        dateField: '2024-03-15'
      };

      const result = prompt.validateAndConvert(testData);
      expect(typeof result.stringField).toBe('string');
      expect(typeof result.integerField).toBe('number');
      expect(Number.isInteger(result.integerField)).toBe(true);
      expect(typeof result.floatField).toBe('number');
      expect(typeof result.booleanField).toBe('boolean');
      expect(result.dateField instanceof Date).toBe(true);
    });

    it('should handle null values', () => {
      const prompt = new BasePrompt({
        typeDefinitions: {
          stringField: 'string',
          integerField: 'integer'
        }
      });

      const testData = {
        stringField: null,
        integerField: null
      };

      const result = prompt.validateAndConvert(testData);
      expect(result.stringField).toBeNull();
      expect(result.integerField).toBeNull();
    });

    it('should handle invalid values by converting them to null', () => {
      const prompt = new BasePrompt({
        typeDefinitions: {
          integerField: 'integer',
          floatField: 'float',
          dateField: 'date'
        }
      });

      const testData = {
        integerField: 'not a number',
        floatField: 'invalid',
        dateField: 'not a date'
      };

      const result = prompt.validateAndConvert(testData);
      expect(result.integerField).toBeNull();
      expect(result.floatField).toBeNull();
      expect(result.dateField).toBeNull();
    });
  });

  describe('getPromptText', () => {
    it('should throw error when not implemented', () => {
      const prompt = new BasePrompt();
      expect(() => prompt.getPromptText()).toThrow('Method not implemented in base class');
    });
  });

  describe('getProviderPrompt', () => {
    it('should return default prompt text when not overridden', () => {
      const prompt = new BasePrompt();
      const mockPromptText = 'Test prompt text';
      prompt.getPromptText = jest.fn().mockReturnValue(mockPromptText);
      
      expect(prompt.getProviderPrompt('openai')).toBe(mockPromptText);
      expect(prompt.getPromptText).toHaveBeenCalled();
    });
  });
}); 