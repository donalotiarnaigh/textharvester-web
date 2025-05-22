const MemorialOCRPrompt = require('../templates/MemorialOCRPrompt');
const { ProcessingError } = require('../../errorTypes');

describe('MemorialOCRPrompt Empty Sheet Handling', () => {
  let prompt;
  
  beforeEach(() => {
    prompt = new MemorialOCRPrompt();
  });

  it('should throw a ProcessingError with type "empty_sheet" for null data', () => {
    try {
      prompt.validateAndConvert(null);
      fail('Expected error was not thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect(error.type).toBe('empty_sheet');
      expect(error.message).toContain('No data received from OCR processing');
    }
  });

  it('should throw a ProcessingError with type "empty_sheet" for empty object', () => {
    try {
      prompt.validateAndConvert({});
      fail('Expected error was not thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect(error.type).toBe('empty_sheet');
      expect(error.message).toContain('Empty data received from OCR processing');
    }
  });

  it('should throw a ProcessingError with type "empty_sheet" when all fields are null/empty', () => {
    const emptyData = {
      memorial_number: null,
      first_name: null,
      last_name: null,
      year_of_death: null,
      inscription: null
    };

    try {
      prompt.validateAndConvert(emptyData);
      fail('Expected error was not thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect(error.type).toBe('empty_sheet');
      expect(error.message).toContain('No readable text found on the sheet');
    }
  });

  it('should throw a ProcessingError with type "validation" for missing required field', () => {
    const missingRequiredField = {
      // memorial_number is missing (required)
      first_name: 'JOHN',
      last_name: 'DOE',
      year_of_death: 1950
    };

    try {
      prompt.validateAndConvert(missingRequiredField);
      fail('Expected error was not thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect(error.type).toBe('validation');
      expect(error.message).toContain('Memorial number could not be found');
    }
  });
}); 