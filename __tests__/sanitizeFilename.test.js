const { sanitizeFilename } = require('../src/controllers/resultsManager'); // Adjust path as needed

describe('sanitizeFilename', () => {
  it('should replace invalid characters with underscores', () => {
    // Test cases with invalid characters
    const invalidFilenames = [
      'file/invalid',
      'file\\invalid',
      'file:invalid',
      'file*invalid',
      'file?invalid',
      'file"invalid',
      'file<invalid',
      'file>invalid',
      'file|invalid',
    ];

    const expectedSanitizedFilenames = [
      'file_invalid',
      'file_invalid',
      'file_invalid',
      'file_invalid',
      'file_invalid',
      'file_invalid',
      'file_invalid',
      'file_invalid',
      'file_invalid',
    ];

    invalidFilenames.forEach((invalidFilename, index) => {
      const sanitized = sanitizeFilename(invalidFilename);
      expect(sanitized).toEqual(expectedSanitizedFilenames[index]);
    });
  });

  it('should leave valid filenames unchanged', () => {
    const validFilenames = [
      'file_name',
      'file-name',
      'filename123',
      'file.name',
    ];

    validFilenames.forEach((validFilename) => {
      const sanitized = sanitizeFilename(validFilename);
      expect(sanitized).toEqual(validFilename); // It should remain the same
    });
  });

  describe('sanitizeFilename', () => {
    it('should handle empty and null inputs', () => {
      const emptyFilename = '';
      const nullFilename = null;

      expect(sanitizeFilename(emptyFilename)).toEqual('_'); // Corrected: Empty input should return an underscore
      expect(sanitizeFilename(nullFilename)).toEqual('_'); // Corrected: Null input should also return an underscore
    });
  });
});
