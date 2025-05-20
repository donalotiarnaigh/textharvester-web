const MemorialOCRPrompt = require('../templates/MemorialOCRPrompt');
const { memorialTypes } = require('../types/memorialTypes');

describe('MemorialOCRPrompt', () => {
  describe('constructor', () => {
    it('should initialize with memorial type definitions', () => {
      const prompt = new MemorialOCRPrompt();
      expect(prompt.typeDefinitions).toEqual(memorialTypes);
    });

    it('should allow overriding default config', () => {
      const config = {
        version: '2.0.0',
        description: 'Custom memorial prompt'
      };
      const prompt = new MemorialOCRPrompt(config);
      expect(prompt.version).toBe('2.0.0');
      expect(prompt.description).toBe('Custom memorial prompt');
      expect(prompt.typeDefinitions).toEqual(memorialTypes);
    });
  });

  describe('getPromptText', () => {
    it('should return a properly formatted prompt', () => {
      const prompt = new MemorialOCRPrompt();
      const promptText = prompt.getPromptText();
      
      // Check for essential prompt components
      expect(promptText).toContain('heritage/genealogy context');
      expect(promptText).toContain('memorial_number');
      expect(promptText).toContain('first_name');
      expect(promptText).toContain('last_name');
      expect(promptText).toContain('year_of_death');
      expect(promptText).toContain('inscription');
      expect(promptText).toContain('JSON format');
      
      // Check for type information
      expect(promptText).toContain('INTEGER');
      expect(promptText).toContain('STRING');
      
      // Check for example format
      expect(promptText).toContain('{');
      expect(promptText).toContain('}');
      expect(promptText).toContain('null');
    });
  });

  describe('getProviderPrompt', () => {
    let prompt;
    
    beforeEach(() => {
      prompt = new MemorialOCRPrompt();
    });

    it('should return base prompt for unknown providers', () => {
      const basePrompt = prompt.getPromptText();
      expect(prompt.getProviderPrompt('unknown')).toBe(basePrompt);
    });

    it('should return optimized prompt for OpenAI', () => {
      const openaiPrompt = prompt.getProviderPrompt('openai');
      expect(openaiPrompt).toContain('JSON format');
      expect(openaiPrompt).toContain('response_format: { type: "json_object" }');
    });

    it('should return optimized prompt for Anthropic', () => {
      const anthropicPrompt = prompt.getProviderPrompt('anthropic');
      expect(anthropicPrompt).toContain('JSON format');
      expect(anthropicPrompt).toContain('All numeric values (memorial_number, year_of_death) MUST be actual integers');
    });
  });

  describe('validateAndConvert', () => {
    let prompt;
    
    beforeEach(() => {
      prompt = new MemorialOCRPrompt();
    });

    it('should properly validate and convert memorial data', () => {
      const testData = {
        memorial_number: '42',
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: '1923',
        inscription: 'REST IN PEACE',
        file_name: 'test.jpg',
        ai_provider: 'openai',
        model_version: 'gpt-4',
        prompt_template: 'memorialOCR',
        prompt_version: '2.0.0'
      };

      const result = prompt.validateAndConvert(testData);
      expect(result).toEqual({
        memorial_number: 42,
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: 1923,
        inscription: 'REST IN PEACE',
        file_name: 'test.jpg',
        ai_provider: 'openai',
        model_version: 'gpt-4',
        prompt_template: 'memorialOCR',
        prompt_version: '2.0.0'
      });
    });

    it('should handle missing or null fields', () => {
      const testData = {
        memorial_number: null,
        first_name: 'JOHN',
        last_name: 'DOE',
        file_name: 'test.jpg',
        ai_provider: 'anthropic'
      };

      const result = prompt.validateAndConvert(testData);
      expect(result).toEqual({
        memorial_number: null,
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: null,
        inscription: null,
        file_name: 'test.jpg',
        ai_provider: 'anthropic',
        model_version: null,
        prompt_template: null,
        prompt_version: null
      });
    });

    it('should handle invalid numeric values', () => {
      const testData = {
        memorial_number: 'not a number',
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: 'circa 1923',
        inscription: 'TEST',
        file_name: 'test.jpg'
      };

      const result = prompt.validateAndConvert(testData);
      expect(result).toEqual({
        memorial_number: null,
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: null,
        inscription: 'TEST',
        file_name: 'test.jpg',
        ai_provider: null,
        model_version: null,
        prompt_template: null,
        prompt_version: null
      });
    });
  });
}); 