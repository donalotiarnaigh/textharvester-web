/**
 * Unit tests for memorial fields
 */

const { 
  MemorialField, 
  MEMORIAL_FIELDS, 
  validateMemorialData, 
  transformMemorialData 
} = require('../memorialFields');

// Import the name processing utilities
const { preprocessName, formatName } = require('../../../nameProcessing');

describe('MemorialField', () => {
  it('should create a field with default values', () => {
    const field = new MemorialField('test', 'string');
    expect(field.name).toBe('test');
    expect(field.type.name).toBe('string');
    expect(field.description).toBe('');
    expect(field.required).toBe(false);
    expect(field.transform('value')).toBe('value');
  });

  it('should create a field with custom metadata', () => {
    const transform = jest.fn(val => val.toUpperCase());
    const field = new MemorialField('test', 'string', {
      description: 'Test field',
      required: true,
      transform
    });
    
    expect(field.description).toBe('Test field');
    expect(field.required).toBe(true);
    
    field.transform('test');
    expect(transform).toHaveBeenCalledWith('test');
  });
});

describe('MEMORIAL_FIELDS', () => {
  it('should define required fields for a memorial record', () => {
    expect(MEMORIAL_FIELDS.memorial_number).toBeDefined();
    expect(MEMORIAL_FIELDS.first_name).toBeDefined();
    expect(MEMORIAL_FIELDS.last_name).toBeDefined();
    expect(MEMORIAL_FIELDS.year_of_death).toBeDefined();
    expect(MEMORIAL_FIELDS.inscription).toBeDefined();
  });

  describe('first_name field', () => {
    it('should allow valid first names', () => {
      const field = MEMORIAL_FIELDS.first_name;
      
      // Should not throw for valid names
      expect(() => field.validate('John')).not.toThrow();
      expect(() => field.validate('Mary-Jane')).not.toThrow();
      expect(() => field.validate('O\'Brien')).not.toThrow();
      expect(() => field.validate('J.R.')).not.toThrow();
      expect(() => field.validate('José')).not.toThrow(); // Accented characters
      expect(() => field.validate('Mary Anne')).not.toThrow(); // Multiple names
    });

    it('should transform first names correctly', () => {
      const field = MEMORIAL_FIELDS.first_name;
      
      // Basic transformation
      expect(field.transform('john')).toBe('JOHN');
      
      // Should handle null by returning empty string (updated behavior)
      expect(field.transform(null)).toBe('');
      
      // Should standardize initials
      expect(field.transform('J R')).toBe('J.R.');
      expect(field.transform('JR')).toBe('J.R.');
    });
    
    it('should integrate with name processing utilities', () => {
      const field = MEMORIAL_FIELDS.first_name;
      
      const processed = preprocessName('Rev. John Smith');
      expect(field.transform(processed.firstName)).toBe('JOHN');
    });
  });

  describe('last_name field', () => {
    it('should allow valid last names', () => {
      const field = MEMORIAL_FIELDS.last_name;
      
      // Should not throw for valid names
      expect(() => field.validate('Smith')).not.toThrow();
      expect(() => field.validate('O\'Brien')).not.toThrow();
      expect(() => field.validate('Smith-Jones')).not.toThrow();
      expect(() => field.validate('van der Waals')).not.toThrow();
      expect(() => field.validate('Müller')).not.toThrow(); // Accented characters
    });

    it('should transform last names correctly', () => {
      const field = MEMORIAL_FIELDS.last_name;
      
      // Basic transformation
      expect(field.transform('smith')).toBe('SMITH');
      
      // Should handle null safely
      expect(field.transform(null)).toBe(null);
      
      // Should preserve compound last names
      expect(field.transform('van der Waals')).toBe('VAN DER WAALS');
    });
    
    it('should integrate with name processing utilities', () => {
      const field = MEMORIAL_FIELDS.last_name;
      
      const processed = preprocessName('John van der Waals');
      expect(field.transform(processed.lastName)).toBe('VAN DER WAALS');
    });
  });
});

describe('validateMemorialData', () => {
  it('should validate complete memorial data', () => {
    const validData = {
      memorial_number: 'HG123',
      first_name: 'John',
      last_name: 'Smith',
      year_of_death: 1900,
      inscription: 'In loving memory'
    };
    
    expect(() => validateMemorialData(validData)).not.toThrow();
  });

  it('should validate data with missing non-required fields', () => {
    const partialData = {
      memorial_number: 'HG123',
      first_name: 'John',
      last_name: 'Smith'
    };
    
    expect(() => validateMemorialData(partialData)).not.toThrow();
  });

  it('should reject data with missing required fields', () => {
    const invalidData = {
      memorial_number: 'HG123',
      first_name: 'John'
      // Missing last_name which is required
    };
    
    expect(() => validateMemorialData(invalidData)).toThrow();
  });

  it('should handle empty string as valid for non-required fields', () => {
    const validData = {
      memorial_number: 'HG123',
      first_name: '',  // Now allowed to be empty
      last_name: 'Smith',
      year_of_death: null,
      inscription: ''
    };
    
    expect(() => validateMemorialData(validData)).not.toThrow();
  });
});

describe('transformMemorialData', () => {
  it('should transform memorial data correctly', () => {
    const rawData = {
      memorial_number: ' HG123 ',
      first_name: 'john',
      last_name: 'smith',
      year_of_death: '1900',
      inscription: ' In loving memory '
    };
    
    const transformed = transformMemorialData(rawData);
    
    expect(transformed.memorial_number).toBe('HG123');
    expect(transformed.first_name).toBe('JOHN');
    expect(transformed.last_name).toBe('SMITH');
    expect(transformed.inscription).toBe('In loving memory');
  });

  it('should handle null values safely', () => {
    const rawData = {
      memorial_number: 'HG123',
      first_name: null,
      last_name: 'Smith',
      year_of_death: null,
      inscription: null
    };
    
    const transformed = transformMemorialData(rawData);
    
    expect(transformed.memorial_number).toBe('HG123');
    expect(transformed.first_name).toBe('');  // Now returns empty string instead of null
    expect(transformed.last_name).toBe('SMITH');
    expect(transformed.inscription).toBe(null);
  });

  it('should handle missing fields', () => {
    const rawData = {
      memorial_number: 'HG123',
      first_name: 'John',
      last_name: 'Smith'
      // year_of_death and inscription missing
    };
    
    const transformed = transformMemorialData(rawData);
    
    expect(transformed.memorial_number).toBe('HG123');
    expect(transformed.first_name).toBe('JOHN');
    expect(transformed.last_name).toBe('SMITH');
    expect(transformed.year_of_death).toBeUndefined();
    expect(transformed.inscription).toBeUndefined();
  });
}); 