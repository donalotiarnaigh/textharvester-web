/**
 * Unit tests for name processing utilities
 */

const {
  detectPrefix,
  detectSuffix,
  handleInitials,
  preprocessName,
  formatName
} = require('../nameProcessing');

describe('Name Processing Utilities', () => {
  describe('detectPrefix', () => {
    it('should detect common name prefixes', () => {
      expect(detectPrefix('Rev. John Smith')).toEqual({
        prefix: 'Rev.',
        remainder: 'John Smith'
      });
      expect(detectPrefix('Dr. Jane Doe')).toEqual({
        prefix: 'Dr.',
        remainder: 'Jane Doe'
      });
      expect(detectPrefix('Mr. Robert Johnson')).toEqual({
        prefix: 'Mr.',
        remainder: 'Robert Johnson'
      });
      expect(detectPrefix('Mrs. Emma Wilson')).toEqual({
        prefix: 'Mrs.',
        remainder: 'Emma Wilson'
      });
    });

    it('should handle prefixes without periods', () => {
      expect(detectPrefix('Rev John Smith')).toEqual({
        prefix: 'Rev',
        remainder: 'John Smith'
      });
      expect(detectPrefix('Mr Robert Johnson')).toEqual({
        prefix: 'Mr',
        remainder: 'Robert Johnson'
      });
    });

    it('should return null prefix for names without prefixes', () => {
      expect(detectPrefix('John Smith')).toEqual({
        prefix: null,
        remainder: 'John Smith'
      });
      expect(detectPrefix('Smith')).toEqual({
        prefix: null,
        remainder: 'Smith'
      });
    });

    it('should handle case insensitivity', () => {
      expect(detectPrefix('rev. John Smith')).toEqual({
        prefix: 'rev.',
        remainder: 'John Smith'
      });
      expect(detectPrefix('DR Jane Doe')).toEqual({
        prefix: 'DR',
        remainder: 'Jane Doe'
      });
    });
  });

  describe('detectSuffix', () => {
    it('should detect common name suffixes', () => {
      expect(detectSuffix('John Smith Jr.')).toEqual({
        suffix: 'Jr.',
        remainder: 'John Smith'
      });
      expect(detectSuffix('Jane Doe Sr.')).toEqual({
        suffix: 'Sr.',
        remainder: 'Jane Doe'
      });
      expect(detectSuffix('Robert Johnson III')).toEqual({
        suffix: 'III',
        remainder: 'Robert Johnson'
      });
    });

    it('should handle suffixes without periods', () => {
      expect(detectSuffix('John Smith Jr')).toEqual({
        suffix: 'Jr',
        remainder: 'John Smith'
      });
      expect(detectSuffix('Jane Doe Sr')).toEqual({
        suffix: 'Sr',
        remainder: 'Jane Doe'
      });
    });

    it('should detect variations of generational suffixes', () => {
      expect(detectSuffix('John Smith I')).toEqual({
        suffix: 'I',
        remainder: 'John Smith'
      });
      expect(detectSuffix('John Smith II')).toEqual({
        suffix: 'II',
        remainder: 'John Smith'
      });
      expect(detectSuffix('John Smith IV')).toEqual({
        suffix: 'IV',
        remainder: 'John Smith'
      });
      expect(detectSuffix('John Smith V')).toEqual({
        suffix: 'V',
        remainder: 'John Smith'
      });
    });

    it('should detect older suffix spellings', () => {
      expect(detectSuffix('John Smith Junr')).toEqual({
        suffix: 'Junr',
        remainder: 'John Smith'
      });
      expect(detectSuffix('John Smith Senr')).toEqual({
        suffix: 'Senr',
        remainder: 'John Smith'
      });
    });

    it('should return null suffix for names without suffixes', () => {
      expect(detectSuffix('John Smith')).toEqual({
        suffix: null,
        remainder: 'John Smith'
      });
      expect(detectSuffix('Smith')).toEqual({
        suffix: null,
        remainder: 'Smith'
      });
    });

    it('should handle case insensitivity', () => {
      expect(detectSuffix('John Smith jr.')).toEqual({
        suffix: 'jr.',
        remainder: 'John Smith'
      });
      expect(detectSuffix('John Smith SR')).toEqual({
        suffix: 'SR',
        remainder: 'John Smith'
      });
    });
  });

  describe('handleInitials', () => {
    it('should identify and format simple initials', () => {
      expect(handleInitials('J.')).toBe('J.');
      expect(handleInitials('J.R.')).toBe('J.R.');
      expect(handleInitials('J R')).toBe('J.R.');
    });

    it('should add periods to initials without them', () => {
      expect(handleInitials('J')).toBe('J.');
      expect(handleInitials('JR')).toBe('J.R.');
      expect(handleInitials('A B C')).toBe('A.B.C.');
    });

    it('should return null for non-initial inputs', () => {
      expect(handleInitials('John')).toBeNull();
      expect(handleInitials('Smith')).toBeNull();
    });

    it('should handle case insensitivity', () => {
      expect(handleInitials('j.r.')).toBe('J.R.');
      expect(handleInitials('j r')).toBe('J.R.');
    });

    it('should detect whether input is likely initials', () => {
      expect(handleInitials.isInitials('J.')).toBe(true);
      expect(handleInitials.isInitials('J.R.')).toBe(true);
      expect(handleInitials.isInitials('JR')).toBe(true);
      expect(handleInitials.isInitials('John')).toBe(false);
    });
  });

  describe('preprocessName', () => {
    it('should split standard names into first and last name', () => {
      expect(preprocessName('John Smith')).toEqual({
        firstName: 'JOHN',
        lastName: 'SMITH',
        prefix: null,
        suffix: null
      });
      
      expect(preprocessName('Mary Jane Williams')).toEqual({
        firstName: 'MARY JANE',
        lastName: 'WILLIAMS',
        prefix: null,
        suffix: null
      });
    });

    it('should handle empty or null input', () => {
      expect(preprocessName('')).toEqual({
        firstName: '',
        lastName: '',
        prefix: null,
        suffix: null
      });
      
      expect(preprocessName(null)).toEqual({
        firstName: '',
        lastName: '',
        prefix: null,
        suffix: null
      });
    });

    it('should handle single name input as last name', () => {
      expect(preprocessName('Smith')).toEqual({
        firstName: '',
        lastName: 'SMITH',
        prefix: null,
        suffix: null
      });
    });

    it('should handle names with prefixes', () => {
      expect(preprocessName('Rev. John Smith')).toEqual({
        firstName: 'JOHN',
        lastName: 'SMITH',
        prefix: 'REV.',
        suffix: null
      });
    });

    it('should handle names with suffixes', () => {
      expect(preprocessName('John Smith Jr.')).toEqual({
        firstName: 'JOHN',
        lastName: 'SMITH',
        prefix: null,
        suffix: 'JR.'
      });
      
      expect(preprocessName('John Smith III')).toEqual({
        firstName: 'JOHN',
        lastName: 'SMITH',
        prefix: null,
        suffix: 'III'
      });
    });

    it('should handle names with both prefixes and suffixes', () => {
      expect(preprocessName('Rev. John Smith Jr.')).toEqual({
        firstName: 'JOHN',
        lastName: 'SMITH',
        prefix: 'REV.',
        suffix: 'JR.'
      });
    });

    it('should handle names with initials', () => {
      expect(preprocessName('J.R. Smith')).toEqual({
        firstName: 'J.R.',
        lastName: 'SMITH',
        prefix: null,
        suffix: null
      });
      
      expect(preprocessName('J. R. Smith')).toEqual({
        firstName: 'J.R.',
        lastName: 'SMITH',
        prefix: null,
        suffix: null
      });
    });

    it('should handle compound last names', () => {
      expect(preprocessName('Mary Anne Smith-Jones')).toEqual({
        firstName: 'MARY ANNE',
        lastName: 'SMITH-JONES',
        prefix: null,
        suffix: null
      });
      
      expect(preprocessName('John van der Waals')).toEqual({
        firstName: 'JOHN',
        lastName: 'VAN DER WAALS',
        prefix: null,
        suffix: null
      });
    });

    it('should handle apostrophes in names', () => {
      expect(preprocessName('Mary O\'Brien')).toEqual({
        firstName: 'MARY',
        lastName: 'O\'BRIEN',
        prefix: null,
        suffix: null
      });
    });

    it('should handle problematic case from issue log', () => {
      expect(preprocessName('R.R Talbot Junr')).toEqual({
        firstName: 'R.R.',
        lastName: 'TALBOT',
        prefix: null,
        suffix: 'JUNR'
      });
      
      expect(preprocessName('Rev. Peter Butler')).toEqual({
        firstName: 'PETER',
        lastName: 'BUTLER',
        prefix: 'REV.',
        suffix: null
      });
    });
  });

  describe('formatName', () => {
    it('should format name components into a standardized structure', () => {
      expect(formatName('JOHN', 'SMITH')).toEqual({
        first_name: 'JOHN',
        last_name: 'SMITH'
      });
      
      expect(formatName('J.R.', 'SMITH')).toEqual({
        first_name: 'J.R.',
        last_name: 'SMITH'
      });
      
      expect(formatName('', 'SMITH')).toEqual({
        first_name: '',
        last_name: 'SMITH'
      });
    });

    it('should handle prefix and suffix', () => {
      expect(formatName('JOHN', 'SMITH', 'REV.', 'JR.')).toEqual({
        first_name: 'JOHN',
        last_name: 'SMITH',
        prefix: 'REV.',
        suffix: 'JR.'
      });
    });

    it('should handle missing or null components', () => {
      expect(formatName(null, 'SMITH')).toEqual({
        first_name: '',
        last_name: 'SMITH'
      });
      
      expect(formatName('JOHN', null)).toEqual({
        first_name: 'JOHN',
        last_name: ''
      });
    });
  });
}); 