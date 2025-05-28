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
      expect(stringType.validate('test').errors).toHaveLength(0);
      expect(stringType.validate(123).errors).toHaveLength(1);
      
      // Test conversion
      expect(stringType.validate('test').value).toBe('test');
      expect(stringType.validate('  test  ').value).toBe('test');
    });

    it('should validate and convert integer types', () => {
      const integerType = new IntegerType();
      
      // Test validation
      expect(integerType.validate(123).errors).toHaveLength(0);
      expect(integerType.validate('123').errors).toHaveLength(1);
      
      // Test conversion
      expect(integerType.validate(123).value).toBe(123);
      expect(integerType.validate(-123).value).toBe(-123);
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
      const data = {
        memorial_number: 'HG123',
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: '1900',
        inscription: 'Rest in Peace'
      };

      const transformed = transformMemorialData(data);
      
      expect(transformed.memorial_number).toBe('HG123');
      expect(transformed.first_name).toBe('JOHN'); // Accept uppercase as is
      expect(transformed.last_name).toBe('DOE'); // Accept uppercase as is
      expect(transformed.year_of_death).toBe(1900);
      expect(transformed.inscription).toBe('Rest in Peace');
    });

    it('should handle missing optional fields', () => {
      const data = {
        memorial_number: 'HG123',
        first_name: 'John'
      };

      const result = validateMemorialData(data);
      expect(result.errors).toHaveLength(0);
      expect(result.value.last_name).toBeNull();
      expect(result.value.year_of_death).toBeNull();
    });

    it('should reject invalid data types', () => {
      const invalidData = {
        memorial_number: 123, // Should be string
        first_name: true, // Should be string
        year_of_death: 'invalid' // Should be number
      };

      const result = validateMemorialData(invalidData);
      expect(result.errors).toHaveLength(3);
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