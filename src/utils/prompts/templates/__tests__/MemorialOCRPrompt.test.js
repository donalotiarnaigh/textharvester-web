/**
 * Unit tests for MemorialOCRPrompt
 */

const MemorialOCRPrompt = require('../MemorialOCRPrompt');
const { ProcessingError } = require('../../../errorTypes');

// Mock standardNameParser
jest.mock('../../../standardNameParser', () => ({
  standardizeNameParsing: jest.fn().mockImplementation((data, options) => {
    // Handle test cases based on input
    if (data.full_name === 'Rev. John Smith Jr.') {
      return {
        first_name: 'JOHN',
        last_name: 'SMITH',
        prefix: 'REV.',
        suffix: 'JR.'
      };
    } else if (data.full_name === 'J.R. Smith III') {
      return {
        first_name: 'J.R.',
        last_name: 'SMITH',
        suffix: 'III'
      };
    } else if (data.inscription === 'In memory of John Smith who died in 1900') {
      return {
        first_name: 'JOHN',
        last_name: 'SMITH'
      };
    } else if (data.first_name && data.last_name) {
      return {
        first_name: data.first_name.toUpperCase(),
        last_name: data.last_name.toUpperCase()
      };
    } else if (data.last_name && !data.first_name) {
      return {
        first_name: '',
        last_name: data.last_name.toUpperCase()
      };
    } else {
      return {
        first_name: 'JOHN',
        last_name: 'SMITH'
      };
    }
  })
}));

// Mock the console.log to capture logs
const originalConsoleLog = console.log;
let consoleOutput = [];
beforeEach(() => {
  consoleOutput = [];
  console.log = jest.fn((...args) => {
    consoleOutput.push(args.join(' '));
  });
});

afterEach(() => {
  console.log = originalConsoleLog;
  jest.clearAllMocks();
});

describe('MemorialOCRPrompt', () => {
  let prompt;

  beforeEach(() => {
    prompt = new MemorialOCRPrompt();
  });

  describe('validateAndConvert', () => {
    it('should process and validate name information correctly', () => {
      const data = {
        memorial_number: 'HG123',
        first_name: 'John',
        last_name: 'Smith',
        year_of_death: 1900,
        inscription: 'In loving memory'
      };
      
      const result = prompt.validateAndConvert(data);
      
      expect(result.memorial_number).toBe('HG123');
      expect(result.first_name).toBe('JOHN');
      expect(result.last_name).toBe('SMITH');
      expect(result.year_of_death).toBe(1900);
      expect(result.inscription).toBe('In loving memory');
    });
    
    it('should preprocess full name when both first and last name are provided as a single string', () => {
      const data = {
        memorial_number: 'HG123',
        full_name: 'Rev. John Smith Jr.',
        year_of_death: 1900
      };
      
      const result = prompt.validateAndConvert(data);
      
      expect(result.first_name).toBe('JOHN');
      expect(result.last_name).toBe('SMITH');
      expect(result.prefix).toBe('REV.');
      expect(result.suffix).toBe('JR.');
    });
    
    it('should handle missing first name by using fallback logic', () => {
      const data = {
        memorial_number: 'HG123',
        last_name: 'Smith',
        year_of_death: 1900
      };
      
      const result = prompt.validateAndConvert(data);
      
      expect(result.first_name).toBe('');
      expect(result.last_name).toBe('SMITH');
    });
    
    it('should extract name components from inscription when name fields are missing', () => {
      const data = {
        memorial_number: 'HG123',
        inscription: 'In memory of John Smith who died in 1900'
      };
      
      const { standardizeNameParsing } = require('../../../standardNameParser');
      
      const result = prompt.validateAndConvert(data);
      
      expect(standardizeNameParsing).toHaveBeenCalled();
      expect(result.first_name).toBe('JOHN');
      expect(result.last_name).toBe('SMITH');
    });
    
    it('should log name processing information for debugging', () => {
      const data = {
        memorial_number: 'HG123',
        full_name: 'Rev. John Smith Jr.',
        year_of_death: 1900
      };
      
      prompt.validateAndConvert(data);
      
      // Check that logs include raw data input and standardized name data
      expect(consoleOutput.some(log => log.includes('Raw data input'))).toBe(true);
      expect(consoleOutput.some(log => log.includes('Standardized name data'))).toBe(true);
    });
    
    it('should handle complex name variations', () => {
      const data = {
        memorial_number: 'HG123',
        full_name: 'J.R. Smith III'
      };
      
      const result = prompt.validateAndConvert(data);
      
      expect(result.first_name).toBe('J.R.');
      expect(result.last_name).toBe('SMITH');
      expect(result.suffix).toBe('III');
    });
    
    it('should throw descriptive error for invalid name format', () => {
      const data = {
        memorial_number: 'HG123',
        first_name: '123', // Invalid name with numbers
        last_name: 'Smith'
      };
      
      expect(() => prompt.validateAndConvert(data)).toThrow(/Invalid name format/);
      expect(() => prompt.validateAndConvert(data)).toThrow(/first_name/i);
    });
  });
}); 