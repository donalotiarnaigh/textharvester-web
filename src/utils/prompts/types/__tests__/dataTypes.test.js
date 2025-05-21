const { DataType, StringType, IntegerType, BooleanType, validateValue } = require('../dataTypes');

describe('Data Types Module', () => {
  describe('Base DataType', () => {
    it('should create a DataType with name and validator', () => {
      const type = new DataType('test', (val) => typeof val === 'string');
      expect(type.name).toBe('test');
      expect(type.validate('test')).toBe(true);
      expect(type.validate(123)).toBe(false);
    });
  });

  describe('StringType', () => {
    const stringType = new StringType();

    it('should validate strings correctly', () => {
      expect(stringType.validate('test')).toBe(true);
      expect(stringType.validate('')).toBe(true);
      expect(stringType.validate(123)).toBe(false);
      expect(stringType.validate(null)).toBe(false);
    });

    it('should convert values to strings', () => {
      expect(stringType.convert('test')).toBe('test');
      expect(stringType.convert(123)).toBe('123');
      expect(stringType.convert(true)).toBe('true');
    });
  });

  describe('IntegerType', () => {
    const integerType = new IntegerType();

    it('should validate integers correctly', () => {
      expect(integerType.validate(123)).toBe(true);
      expect(integerType.validate(-123)).toBe(true);
      expect(integerType.validate(123.45)).toBe(false);
      expect(integerType.validate('123')).toBe(false);
    });

    it('should convert values to integers', () => {
      expect(integerType.convert('123')).toBe(123);
      expect(integerType.convert(123.45)).toBe(123);
      expect(() => integerType.convert('abc')).toThrow();
    });
  });

  describe('BooleanType', () => {
    const booleanType = new BooleanType();

    it('should validate booleans correctly', () => {
      expect(booleanType.validate(true)).toBe(true);
      expect(booleanType.validate(false)).toBe(true);
      expect(booleanType.validate('true')).toBe(false);
      expect(booleanType.validate(1)).toBe(false);
    });

    it('should convert values to booleans', () => {
      expect(booleanType.convert('true')).toBe(true);
      expect(booleanType.convert('false')).toBe(false);
      expect(booleanType.convert(1)).toBe(true);
      expect(booleanType.convert(0)).toBe(false);
    });
  });

  describe('validateValue', () => {
    it('should validate values against specified type', () => {
      expect(() => validateValue('test', new StringType())).not.toThrow();
      expect(() => validateValue(123, new IntegerType())).not.toThrow();
      expect(() => validateValue('123', new IntegerType())).toThrow();
    });

    it('should handle null and undefined', () => {
      expect(() => validateValue(null, new StringType())).toThrow();
      expect(() => validateValue(undefined, new StringType())).toThrow();
    });
  });
}); 