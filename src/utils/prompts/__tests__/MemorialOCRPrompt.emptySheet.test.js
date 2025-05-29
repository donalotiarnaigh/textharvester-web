/**
 * Unit tests for MemorialOCRPrompt empty sheet handling
 */

const MemorialOCRPrompt = require('../templates/MemorialOCRPrompt');
const { ProcessingError } = require('../../errorTypes');

describe('MemorialOCRPrompt Empty Sheet Handling', () => {
  let prompt;
  
  beforeEach(() => {
    prompt = new MemorialOCRPrompt();
  });

  it('should throw a ProcessingError with type "empty_sheet" for null data', () => {
    expect(() => {
      prompt.validateAndConvert(null);
    }).toThrow(ProcessingError);

    try {
      prompt.validateAndConvert(null);
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect(error.type).toBe('empty_sheet');
      expect(error.message).toContain('No data received from OCR processing');
    }
  });

  it('should throw a ProcessingError with type "empty_sheet" for empty object', () => {
    expect(() => {
      prompt.validateAndConvert({});
    }).toThrow(ProcessingError);

    try {
      prompt.validateAndConvert({});
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect(error.type).toBe('empty_sheet');
      expect(error.message).toContain('Empty data received from OCR processing');
    }
  });

  it('should throw a ProcessingError for missing required field', () => {
    const data = {
      memorial_number: null,
      first_name: null,
      last_name: null,
      year_of_death: null,
      inscription: null
    };

    expect(() => {
      prompt.validateAndConvert(data);
    }).toThrow(ProcessingError);

    try {
      prompt.validateAndConvert(data);
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      // Current implementation throws validation error for missing required field
      expect(error.type).toBe('validation');
      expect(error.message).toContain('memorial_number could not be found');
    }
  });

  it('should throw a ProcessingError with type "validation" for missing required field', () => {
    const data = {
      first_name: 'John',
      last_name: 'Smith',
      year_of_death: 1900,
      inscription: 'Rest in Peace'
      // memorial_number is missing
    };

    expect(() => {
      prompt.validateAndConvert(data);
    }).toThrow(ProcessingError);

    try {
      prompt.validateAndConvert(data);
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect(error.type).toBe('validation');
      expect(error.message).toContain('memorial_number could not be found');
    }
  });

  it('should throw a ProcessingError for empty string fields', () => {
    const data = {
      memorial_number: '',
      first_name: '',
      last_name: '',
      year_of_death: null,
      inscription: ''
    };

    expect(() => {
      prompt.validateAndConvert(data);
    }).toThrow(ProcessingError);

    try {
      prompt.validateAndConvert(data);
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      // Current implementation throws validation error for empty memorial_number
      expect(error.type).toBe('validation');
      expect(error.message).toContain('memorial_number could not be found');
    }
  });
}); 