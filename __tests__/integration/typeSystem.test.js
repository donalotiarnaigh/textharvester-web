const { 
  StringType, 
  IntegerType, 
  validateValue 
} = require('../../src/utils/prompts/types/dataTypes');

const {
  MEMORIAL_FIELDS,
  validateMemorialData,
  transformMemorialData
} = require('../../src/utils/prompts/types/memorialFields');

describe('Type System Integration', () => {
  describe('Data Types Integration', () => {
    it('should validate and convert string types', () => {
      const stringType = new StringType();
      
      // Test validation
      expect(stringType.validate('test')).toBe(true);
      expect(stringType.validate(123)).toBe(false);
      
      // Test conversion
      expect(stringType.convert('test')).toBe('test');
      expect(stringType.convert(123)).toBe('123');
      
      // Test validation function
      expect(() => validateValue('test', stringType)).not.toThrow();
      expect(() => validateValue(null, stringType)).toThrow();
    });

    it('should validate and convert integer types', () => {
      const integerType = new IntegerType();
      
      // Test validation
      expect(integerType.validate(123)).toBe(true);
      expect(integerType.validate('123')).toBe(false);
      
      // Test conversion
      expect(integerType.convert('123')).toBe(123);
      expect(integerType.convert(123.5)).toBe(123);
      
      // Test validation function
      expect(() => validateValue(123, integerType)).not.toThrow();
      expect(() => validateValue('abc', integerType)).toThrow();
    });
  });

  describe('Memorial Fields Integration', () => {
    it('should validate complete memorial data', () => {
      const validData = {
        memorial_number: 'HG123',
        first_name: 'John',
        last_name: 'Doe',
        year_of_death: 1900,
        inscription: 'Rest in Peace'
      };

      expect(() => validateMemorialData(validData)).not.toThrow();
    });

    it('should transform memorial data correctly', () => {
      const rawData = {
        memorial_number: ' HG123 ',  // Has whitespace
        first_name: ' John ',
        last_name: ' Doe ',
        year_of_death: 1900,
        inscription: ' Rest in Peace '
      };

      const transformed = transformMemorialData(rawData);
      
      expect(transformed.memorial_number).toBe('HG123');
      expect(transformed.first_name).toBe('John');
      expect(transformed.last_name).toBe('Doe');
      expect(transformed.year_of_death).toBe(1900);
      expect(transformed.inscription).toBe('Rest in Peace');
    });

    it('should handle missing optional fields', () => {
      const dataWithoutOptional = {
        memorial_number: 'HG124',
        first_name: 'Jane',
        last_name: 'Smith',
        year_of_death: 1901
        // inscription is optional and missing
      };

      expect(() => validateMemorialData(dataWithoutOptional)).not.toThrow();
      const transformed = transformMemorialData(dataWithoutOptional);
      expect(transformed.inscription).toBeUndefined();
    });

    it('should reject invalid data types', () => {
      const invalidData = {
        memorial_number: 123,  // Should be string
        first_name: 'Jane',
        last_name: 'Smith',
        year_of_death: '1901', // Should be number
        inscription: null
      };

      expect(() => validateMemorialData(invalidData)).toThrow();
    });

    it('should reject missing required fields', () => {
      const missingRequired = {
        first_name: 'Jane',
        last_name: 'Smith',
        year_of_death: 1901
        // memorial_number is missing
      };

      expect(() => validateMemorialData(missingRequired)).toThrow('Missing required field: memorial_number');
    });
  });
}); 