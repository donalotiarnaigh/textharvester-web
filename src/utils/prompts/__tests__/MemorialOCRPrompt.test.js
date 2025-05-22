const MemorialOCRPrompt = require('../templates/MemorialOCRPrompt');
const { MEMORIAL_FIELDS } = require('../types/memorialFields');

describe('MemorialOCRPrompt', () => {
  describe('constructor', () => {
    it('should initialize with memorial field definitions', () => {
      const prompt = new MemorialOCRPrompt();
      expect(prompt.fields).toEqual(MEMORIAL_FIELDS);
      expect(prompt.version).toBe('2.0.0');
      expect(prompt.description).toBe('Standard OCR prompt for extracting basic memorial inscription data with type validation');
    });

    it('should allow overriding default config', () => {
      const config = {
        version: '2.1.0',
        description: 'Custom memorial prompt',
        providers: ['openai']
      };
      const prompt = new MemorialOCRPrompt(config);
      expect(prompt.version).toBe('2.1.0');
      expect(prompt.description).toBe('Custom memorial prompt');
      expect(prompt.providers).toEqual(['openai']);
      expect(prompt.fields).toEqual(MEMORIAL_FIELDS);
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

  describe('validateAndConvert', () => {
    let prompt;
    
    beforeEach(() => {
      prompt = new MemorialOCRPrompt();
    });

    it('should properly validate and convert memorial data', () => {
      const testData = {
        memorial_number: ' HG-42 ',  // Has whitespace
        first_name: 'john',          // Lowercase
        last_name: 'doe',            // Lowercase
        year_of_death: '1923',       // String number
        inscription: ' REST IN PEACE ', // Has whitespace
        file_name: 'test.jpg',
        ai_provider: 'openai',
        model_version: 'gpt-4',
        prompt_template: 'memorialOCR',
        prompt_version: '2.0.0'
      };

      const result = prompt.validateAndConvert(testData);
      expect(result).toEqual({
        memorial_number: 'HG-42',    // Trimmed
        first_name: 'JOHN',          // Uppercase
        last_name: 'DOE',            // Uppercase
        year_of_death: 1923,         // Converted to number
        inscription: 'REST IN PEACE', // Trimmed
        file_name: 'test.jpg',
        ai_provider: 'openai',
        model_version: 'gpt-4',
        prompt_template: 'memorialOCR',
        prompt_version: '2.0.0'
      });
    });

    it('should handle missing optional fields', () => {
      const testData = {
        memorial_number: 'HG-43',
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: 1924
        // inscription is optional
      };

      const result = prompt.validateAndConvert(testData);
      expect(result.memorial_number).toBe('HG-43');
      expect(result.first_name).toBe('JOHN');
      expect(result.last_name).toBe('DOE');
      expect(result.year_of_death).toBe(1924);
      expect(result.inscription).toBeNull();
    });

    it('should reject empty or null input data', () => {
      expect(() => prompt.validateAndConvert(null))
        .toThrow('Empty or invalid data received from OCR processing');
      
      expect(() => prompt.validateAndConvert({}))
        .toThrow('Empty or invalid data received from OCR processing');
    });

    it('should handle null values in required fields', () => {
      // Test memorial_number null
      expect(() => prompt.validateAndConvert({
        memorial_number: null,
        first_name: 'JOHN',
        last_name: 'DOE'
      })).toThrow('Memorial_number is required');

      // Test first_name null
      expect(() => prompt.validateAndConvert({
        memorial_number: 'HG-44',
        first_name: null,
        last_name: 'DOE'
      })).toThrow('First_name is required');

      // Test last_name null
      expect(() => prompt.validateAndConvert({
        memorial_number: 'HG-44',
        first_name: 'JOHN',
        last_name: null
      })).toThrow('Last_name is required');
    });

    it('should safely transform null values in optional fields', () => {
      const testData = {
        memorial_number: 'HG-44',
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: null,
        inscription: null
      };

      const result = prompt.validateAndConvert(testData);
      expect(result.memorial_number).toBe('HG-44');
      expect(result.first_name).toBe('JOHN');
      expect(result.last_name).toBe('DOE');
      expect(result.year_of_death).toBeNull();
      expect(result.inscription).toBeNull();
    });

    it('should reject invalid year values', () => {
      const testData = {
        memorial_number: 'HG-44',
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: 1400  // Too early
      };

      expect(() => {
        prompt.validateAndConvert(testData);
      }).toThrow('Year_of_death must be between 1500 and');

      testData.year_of_death = new Date().getFullYear() + 1; // Future year
      expect(() => {
        prompt.validateAndConvert(testData);
      }).toThrow('Year_of_death must be between 1500 and');
    });

    it('should reject missing required fields', () => {
      const testData = {
        // memorial_number missing
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: 1924
      };

      expect(() => {
        prompt.validateAndConvert(testData);
      }).toThrow('Memorial_number is required');
    });

    it('should handle invalid name formats', () => {
      const testData = {
        memorial_number: 'HG-45',
        first_name: 'John123',  // Contains numbers
        last_name: 'DOE',
        year_of_death: 1924
      };

      expect(() => {
        prompt.validateAndConvert(testData);
      }).toThrow('Invalid name format');
    });
  });

  describe('provider integration', () => {
    let prompt;
    
    beforeEach(() => {
      prompt = new MemorialOCRPrompt();
    });

    it('should format OpenAI prompt correctly', () => {
      const openaiPrompt = prompt.getProviderPrompt('openai');
      expect(openaiPrompt.systemPrompt).toContain('OpenAI');
      expect(openaiPrompt.userPrompt).toContain('memorial_number: The memorial\'s identifier (STRING)');
      expect(openaiPrompt.userPrompt).toContain('year_of_death: The first person\'s year of death only (INTEGER)');
      expect(openaiPrompt.userPrompt).toContain('response_format: { type: "json" }');
    });

    it('should format Anthropic prompt correctly', () => {
      const anthropicPrompt = prompt.getProviderPrompt('anthropic');
      expect(anthropicPrompt.systemPrompt).toContain('Claude');
      expect(anthropicPrompt.userPrompt).toContain('memorial_number: The memorial\'s identifier (STRING)');
      expect(anthropicPrompt.userPrompt).toContain('year_of_death: The first person\'s year of death only (INTEGER)');
      expect(anthropicPrompt.userPrompt).toContain('MUST be actual integers');
    });

    it('should validate provider responses', () => {
      const validOpenAIResponse = {
        response_format: { type: 'json' },
        content: {
          memorial_number: 'HG-46',
          first_name: 'JOHN',
          last_name: 'DOE',
          year_of_death: 1925,
          inscription: 'TEST'
        }
      };
      expect(() => {
        prompt.validateProviderResponse('openai', validOpenAIResponse);
      }).not.toThrow();

      const validAnthropicResponse = {
        messages: [{
          role: 'assistant',
          content: JSON.stringify({
            memorial_number: 'HG-46',
            first_name: 'JOHN',
            last_name: 'DOE',
            year_of_death: 1925,
            inscription: 'TEST'
          })
        }]
      };
      expect(() => {
        prompt.validateProviderResponse('anthropic', validAnthropicResponse);
      }).not.toThrow();
    });
  });
}); 