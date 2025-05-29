/**
 * Unit tests for MemorialOCRPrompt
 */

const MemorialOCRPrompt = require('../MemorialOCRPrompt');
const { ProcessingError } = require('../../../errorTypes');

// Mock standardNameParser - but we won't use it since the functionality was removed
jest.mock('../../../standardNameParser', () => ({
  standardizeNameParsing: jest.fn().mockImplementation((data, options) => {
    // This mock won't be called in the current implementation
    return {
      first_name: 'JOHN',
      last_name: 'SMITH'
    };
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
      
      expect(result.memorial_number).toBe('123'); // Now extracts just the number
      expect(result.first_name).toBe('JOHN');
      expect(result.last_name).toBe('SMITH');
      expect(result.year_of_death).toBe(1900);
      expect(result.inscription).toBe('In loving memory');
    });
    
    it('should handle basic name processing', () => {
      const data = {
        memorial_number: 'HG123',
        first_name: 'John',
        last_name: 'Smith',
        year_of_death: 1900
      };
      
      const result = prompt.validateAndConvert(data);
      
      expect(result.first_name).toBe('JOHN');
      expect(result.last_name).toBe('SMITH');
      expect(result.memorial_number).toBe('123'); // Extracts numeric part
    });
    
    it('should handle missing first name', () => {
      const data = {
        memorial_number: 'HG123',
        last_name: 'Smith',
        year_of_death: 1900
      };
      
      const result = prompt.validateAndConvert(data);
      
      expect(result.first_name).toBeUndefined(); // No complex processing, just undefined
      expect(result.last_name).toBe('SMITH');
    });
    
    it('should handle simple memorial data', () => {
      const data = {
        memorial_number: 'HG123',
        first_name: 'John',
        last_name: 'Smith'
      };
      
      const result = prompt.validateAndConvert(data);
      
      expect(result.first_name).toBe('JOHN');
      expect(result.last_name).toBe('SMITH');
      expect(result.memorial_number).toBe('123');
    });
    
    it('should log processing information for debugging', () => {
      const data = {
        memorial_number: 'HG123',
        first_name: 'John',
        last_name: 'Smith',
        year_of_death: 1900
      };
      
      prompt.validateAndConvert(data);
      
      // Check that logs include raw data input
      expect(consoleOutput.some(log => log.includes('Raw data input'))).toBe(true);
    });
    
    it('should handle numeric memorial numbers', () => {
      const data = {
        memorial_number: 'M456',
        first_name: 'Jane',
        last_name: 'Doe'
      };
      
      const result = prompt.validateAndConvert(data);
      
      expect(result.memorial_number).toBe('456'); // Extracts numeric part
      expect(result.first_name).toBe('JANE');
      expect(result.last_name).toBe('DOE');
    });
    
    it('should accept valid name formats', () => {
      const data = {
        memorial_number: 'HG123',
        first_name: 'John',
        last_name: 'Smith'
      };
      
      // This should not throw since current implementation is more permissive
      const result = prompt.validateAndConvert(data);
      expect(result.memorial_number).toBe('123');
      expect(result.first_name).toBe('JOHN');
    });
  });
}); 