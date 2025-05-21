const { StringType, IntegerType } = require('../dataTypes');
const { 
  MemorialField,
  MEMORIAL_FIELDS,
  validateMemorialData,
  transformMemorialData
} = require('../memorialFields');

describe('Memorial Fields Module', () => {
  describe('MemorialField', () => {
    it('should create a field with name, type, and metadata', () => {
      const field = new MemorialField('test_field', new StringType(), {
        description: 'A test field',
        required: true,
        transform: (value) => value.trim()
      });

      expect(field.name).toBe('test_field');
      expect(field.type).toBeInstanceOf(StringType);
      expect(field.description).toBe('A test field');
      expect(field.required).toBe(true);
      expect(field.transform('  test  ')).toBe('test');
    });

    it('should use default values for optional metadata', () => {
      const field = new MemorialField('test_field', new StringType());
      
      expect(field.description).toBe('');
      expect(field.required).toBe(false);
      expect(field.transform('test')).toBe('test');
    });
  });

  describe('MEMORIAL_FIELDS', () => {
    it('should define all required memorial fields', () => {
      const requiredFields = [
        'memorial_number',
        'first_name',
        'last_name',
        'year_of_death',
        'inscription'
      ];

      requiredFields.forEach(fieldName => {
        expect(MEMORIAL_FIELDS[fieldName]).toBeDefined();
        expect(MEMORIAL_FIELDS[fieldName]).toBeInstanceOf(MemorialField);
      });
    });

    it('should have correct types for each field', () => {
      expect(MEMORIAL_FIELDS.memorial_number.type).toBeInstanceOf(StringType);
      expect(MEMORIAL_FIELDS.first_name.type).toBeInstanceOf(StringType);
      expect(MEMORIAL_FIELDS.last_name.type).toBeInstanceOf(StringType);
      expect(MEMORIAL_FIELDS.year_of_death.type).toBeInstanceOf(IntegerType);
      expect(MEMORIAL_FIELDS.inscription.type).toBeInstanceOf(StringType);
    });

    it('should have meaningful descriptions for each field', () => {
      Object.values(MEMORIAL_FIELDS).forEach(field => {
        expect(field.description).toBeTruthy();
        expect(field.description.length).toBeGreaterThan(10);
      });
    });
  });

  describe('validateMemorialData', () => {
    const validData = {
      memorial_number: 'HG123',
      first_name: 'John',
      last_name: 'Doe',
      year_of_death: 1900,
      inscription: 'Rest in Peace'
    };

    it('should validate correct memorial data', () => {
      expect(() => validateMemorialData(validData)).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      const invalidData = { ...validData };
      delete invalidData.memorial_number;
      
      expect(() => validateMemorialData(invalidData))
        .toThrow('Missing required field: memorial_number');
    });

    it('should throw error for invalid field types', () => {
      const invalidData = { 
        ...validData,
        year_of_death: '1900' // Should be number
      };
      
      expect(() => validateMemorialData(invalidData))
        .toThrow('Invalid value "1900" for type integer');
    });

    it('should ignore extra fields', () => {
      const dataWithExtra = {
        ...validData,
        extra_field: 'should be ignored'
      };
      
      expect(() => validateMemorialData(dataWithExtra)).not.toThrow();
    });
  });

  describe('transformMemorialData', () => {
    it('should apply transforms to field values', () => {
      const data = {
        memorial_number: '  HG123  ',
        first_name: '  John  ',
        last_name: '  Doe  ',
        year_of_death: 1900,
        inscription: '  Rest in Peace  '
      };

      const transformed = transformMemorialData(data);
      
      expect(transformed).toEqual({
        memorial_number: 'HG123',
        first_name: 'John',
        last_name: 'Doe',
        year_of_death: 1900,
        inscription: 'Rest in Peace'
      });
    });

    it('should handle missing optional fields', () => {
      const data = {
        memorial_number: 'HG123',
        first_name: 'John',
        last_name: 'Doe',
        year_of_death: 1900
      };

      expect(() => transformMemorialData(data)).not.toThrow();
    });
  });
}); 