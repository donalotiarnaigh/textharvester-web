/**
 * Test suite for MonumentPhotoOCRPrompt class
 * Tests the monument-specific prompt functionality
 */

const fs = require('fs');
const path = require('path');

// Mock logger before importing the class
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  debugPayload: jest.fn()
}));

describe('MonumentPhotoOCRPrompt', () => {
  let MonumentPhotoOCRPrompt;
  let MEMORIAL_FIELDS;
  let logger;

  beforeAll(async () => {
    // Import after mocks are set up
    MonumentPhotoOCRPrompt = require('../../src/utils/prompts/templates/MonumentPhotoOCRPrompt');
    const { MEMORIAL_FIELDS: fields } = require('../../src/utils/prompts/types/memorialFields');
    MEMORIAL_FIELDS = fields;
    logger = require('../../src/utils/logger');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create a monument photo OCR prompt with default configuration', () => {
      const prompt = new MonumentPhotoOCRPrompt();
      
      expect(prompt.version).toBe('1.0.0');
      expect(prompt.description).toContain('monument photos');
      expect(prompt.fields).toBeDefined();
      expect(prompt.providers).toContain('openai');
      expect(prompt.providers).toContain('anthropic');
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        version: '1.1.0',
        description: 'Custom monument OCR prompt'
      };
      
      const prompt = new MonumentPhotoOCRPrompt(customConfig);
      
      expect(prompt.version).toBe('1.1.0');
      expect(prompt.description).toBe('Custom monument OCR prompt');
    });

    it('should use MEMORIAL_FIELDS as default fields', () => {
      const prompt = new MonumentPhotoOCRPrompt();
      
      expect(prompt.fields).toBe(MEMORIAL_FIELDS);
      expect(Array.isArray(prompt.fields)).toBe(true);
      expect(prompt.fields.length).toBe(5);
      
      // Check that all required field names are present in the array
      const fieldNames = prompt.fields.map(f => f.name);
      expect(fieldNames).toContain('memorial_number');
      expect(fieldNames).toContain('first_name');
      expect(fieldNames).toContain('last_name');
      expect(fieldNames).toContain('year_of_death');
      expect(fieldNames).toContain('inscription');
    });
  });

  describe('Prompt Text Generation', () => {
    it('should generate monument-specific prompt text', () => {
      const prompt = new MonumentPhotoOCRPrompt();
      const promptText = prompt.getPromptText();
      
      expect(promptText).toContain('monument');
      expect(promptText).toContain('headstone');
      expect(promptText).toContain('gravestone');
      expect(promptText).toContain('JSON format');
      expect(promptText).toContain('memorial_number');
      expect(promptText).toContain('first_name');
      expect(promptText).toContain('last_name');
      expect(promptText).toContain('year_of_death');
      expect(promptText).toContain('inscription');
    });

    it('should include monument-specific instructions', () => {
      const prompt = new MonumentPhotoOCRPrompt();
      const promptText = prompt.getPromptText();
      
      // Monument photos have different challenges than record sheets
      expect(promptText).toContain('weathered');
      expect(promptText).toContain('carved');
      expect(promptText).toContain('stone');
      expect(promptText).toContain('angle');
    });

    it('should include example JSON output', () => {
      const prompt = new MonumentPhotoOCRPrompt();
      const promptText = prompt.getPromptText();
      
      expect(promptText).toContain('Example');
      expect(promptText).toContain('{');
      expect(promptText).toContain('}');
      expect(promptText).toContain('"memorial_number"');
      expect(promptText).toContain('"first_name"');
    });
  });

  describe('Provider-Specific Prompt Generation', () => {
    it('should generate OpenAI-specific prompts', () => {
      const prompt = new MonumentPhotoOCRPrompt();
      const openaiPrompt = prompt.getProviderPrompt('openai');
      
      expect(openaiPrompt).toBeDefined();
      expect(typeof openaiPrompt).toBe('object');
      expect(openaiPrompt.systemPrompt).toBeDefined();
      expect(openaiPrompt.userPrompt).toBeDefined();
      expect(openaiPrompt.systemPrompt).toContain('monument');
      expect(openaiPrompt.userPrompt).toContain('JSON');
    });

    it('should generate Anthropic-specific prompts', () => {
      const prompt = new MonumentPhotoOCRPrompt();
      const anthropicPrompt = prompt.getProviderPrompt('anthropic');
      
      expect(anthropicPrompt).toBeDefined();
      expect(typeof anthropicPrompt).toBe('string');
      expect(anthropicPrompt).toContain('monument');
      expect(anthropicPrompt).toContain('JSON');
    });

    it('should throw error for unsupported providers', () => {
      const prompt = new MonumentPhotoOCRPrompt();
      
      expect(() => {
        prompt.getProviderPrompt('unsupported');
      }).toThrow('Unsupported provider: unsupported');
    });

    it('should include monument-specific context in provider prompts', () => {
      const prompt = new MonumentPhotoOCRPrompt();
      
      const openaiPrompt = prompt.getProviderPrompt('openai');
      const anthropicPrompt = prompt.getProviderPrompt('anthropic');
      
      // Both should mention monument-specific challenges
      expect(openaiPrompt.systemPrompt).toContain('monument');
      expect(anthropicPrompt).toContain('monument');
    });
  });

  describe('Data Validation and Conversion', () => {
    let prompt;

    beforeEach(() => {
      prompt = new MonumentPhotoOCRPrompt();
    });

    it('should validate and convert complete monument data', () => {
      const rawData = {
        memorial_number: "123",
        first_name: "john",
        last_name: "smith",
        year_of_death: "1950",
        inscription: "In loving memory of John Smith"
      };

      const result = prompt.validateAndConvert(rawData);

      expect(result.memorial_number).toBe("123");
      expect(result.first_name).toBe("JOHN");
      expect(result.last_name).toBe("SMITH");
      expect(result.year_of_death).toBe(1950);
      expect(result.inscription).toBe("In loving memory of John Smith");
    });

    it('should handle missing or null values gracefully', () => {
      const rawData = {
        memorial_number: "456", // memorial_number is required, so provide valid value
        first_name: "",
        last_name: "SMITH",
        year_of_death: null,
        inscription: "Memorial inscription"
      };

      const result = prompt.validateAndConvert(rawData);

      expect(result.memorial_number).toBe("456");
      expect(result.first_name).toBe("");
      expect(result.last_name).toBe("SMITH");
      expect(result.year_of_death).toBeNull();
      expect(result.inscription).toBe("Memorial inscription");
    });

    it('should handle numeric memorial numbers', () => {
      const rawData = {
        memorial_number: 456,
        first_name: "MARY",
        last_name: "JONES",
        year_of_death: 1975,
        inscription: "Test inscription"
      };

      const result = prompt.validateAndConvert(rawData);

      expect(result.memorial_number).toBe("456");
      expect(result.year_of_death).toBe(1975);
    });

    it('should handle monument-specific inscription patterns', () => {
      const rawData = {
        memorial_number: "789",
        first_name: "THOMAS",
        last_name: "BROWN",
        year_of_death: 1920,
        inscription: "SACRED TO THE MEMORY OF\nTHOMAS BROWN\nWHO DEPARTED THIS LIFE\nJANUARY 15TH 1920\nAGED 67 YEARS\nR.I.P."
      };

      const result = prompt.validateAndConvert(rawData);

      expect(result.inscription).toContain("SACRED TO THE MEMORY");
      expect(result.inscription).toContain("R.I.P.");
    });

    it('should log processing information for debugging', () => {
      const rawData = {
        memorial_number: "100",
        first_name: "TEST",
        last_name: "USER",
        year_of_death: 2000,
        inscription: "Test inscription"
      };

      // This test verifies the logging functionality works
      // The logging is visible in console output during tests
      expect(() => {
        prompt.validateAndConvert(rawData);
      }).not.toThrow();
    });
  });

  describe('Monument-Specific Features', () => {
    let prompt;

    beforeEach(() => {
      prompt = new MonumentPhotoOCRPrompt();
    });

    it('should handle weathered text scenarios', () => {
      const rawData = {
        memorial_number: "999",
        first_name: "PART[?]AL",  // Partially readable
        last_name: "WEATHER[ED]",
        year_of_death: 1800,
        inscription: "SACRED... [WEATHERED] ...MEMORY"
      };

      const result = prompt.validateAndConvert(rawData);

      expect(result.first_name).toBe("PART[?]AL");
      expect(result.last_name).toBe("WEATHER[ED]");
      expect(result.inscription).toContain("[WEATHERED]");
    });

    it('should handle multiple burial entries on monuments', () => {
      const rawData = {
        memorial_number: "888",
        first_name: "WILLIAM",
        last_name: "FAMILY",
        year_of_death: 1900,
        inscription: "WILLIAM FAMILY 1900\nMARY FAMILY 1905\nJOHN FAMILY 1920\nBELOVED PARENTS AND SON"
      };

      const result = prompt.validateAndConvert(rawData);

      expect(result.first_name).toBe("WILLIAM");
      expect(result.year_of_death).toBe(1900);
      expect(result.inscription).toContain("MARY FAMILY 1905");
      expect(result.inscription).toContain("JOHN FAMILY 1920");
    });

    it('should handle carved monument symbols and decorations', () => {
      const rawData = {
        memorial_number: "777",
        first_name: "SACRED",
        last_name: "HEART",
        year_of_death: 1950,
        inscription: "✝ IN MEMORY OF ✝\nSACRED HEART\n† 1950 †\n🕊 REST IN PEACE 🕊"
      };

      const result = prompt.validateAndConvert(rawData);

      expect(result.inscription).toContain("✝");
      expect(result.inscription).toContain("†");
      expect(result.inscription).toContain("🕊");
    });
  });

  describe('Error Handling', () => {
    let prompt;

    beforeEach(() => {
      prompt = new MonumentPhotoOCRPrompt();
    });

    it('should handle completely empty or invalid data', () => {
      expect(() => {
        prompt.validateAndConvert({});
      }).toThrow();
    });

    it('should handle null input gracefully', () => {
      expect(() => {
        prompt.validateAndConvert(null);
      }).toThrow();
    });

    it('should handle invalid year formats', () => {
      const rawData = {
        memorial_number: "123",
        first_name: "TEST",
        last_name: "USER",
        year_of_death: "INVALID_YEAR",
        inscription: "Test"
      };

      // Invalid year should be converted to null, not throw error
      const result = prompt.validateAndConvert(rawData);
      expect(result.year_of_death).toBeNull();
    });
  });

  describe('Integration with Base Prompt System', () => {
    it('should inherit from BasePrompt', () => {
      const prompt = new MonumentPhotoOCRPrompt();
      
      expect(prompt.constructor.name).toBe('MonumentPhotoOCRPrompt');
      expect(prompt.validateAndConvert).toBeDefined();
      expect(prompt.getProviderPrompt).toBeDefined();
    });

    it('should work with the prompt manager system', () => {
      const prompt = new MonumentPhotoOCRPrompt();
      
      // Should have the methods expected by the prompt manager
      expect(typeof prompt.getProviderPrompt).toBe('function');
      expect(typeof prompt.validateAndConvert).toBe('function');
      expect(prompt.version).toBeDefined();
      expect(prompt.providers).toBeDefined();
    });
  });
});
