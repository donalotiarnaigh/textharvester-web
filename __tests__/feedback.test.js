const { 
  validateTypeMatch,
  createFeedbackMessage,
  updateLoadingMessage
} = require('../src/utils/feedback');

describe('Feedback System', () => {
  describe('Type Validation', () => {
    test('should detect type mismatch', () => {
      const expected = { type: 'string' };
      const received = 42;
      expect(validateTypeMatch(expected, received)).toBe(false);
    });

    test('should validate matching types', () => {
      const expected = { type: 'string' };
      const received = 'test';
      expect(validateTypeMatch(expected, received)).toBe(true);
    });

    test('should handle nested object validation', () => {
      const expected = { 
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      };
      const received = { name: 'John', age: 30 };
      expect(validateTypeMatch(expected, received)).toBe(true);
    });
  });

  describe('Error Messages', () => {
    test('should create appropriate error message for type mismatch', () => {
      const field = 'name';
      const expected = 'string';
      const received = 'number';
      const message = createFeedbackMessage('type_mismatch', { field, expected, received });
      expect(message).toBe('Type mismatch for field "name": expected string but received number');
    });

    test('should create error message for prompt-related issues', () => {
      const message = createFeedbackMessage('prompt_error', { 
        error: 'Invalid prompt template version'
      });
      expect(message).toBe('Prompt Error: Invalid prompt template version');
    });

    test('should handle unknown error types gracefully', () => {
      const message = createFeedbackMessage('unknown_error', {});
      expect(message).toBe('An unexpected error occurred');
    });
  });

  describe('Loading Messages', () => {
    test('should generate appropriate loading message for prompt processing', () => {
      const message = updateLoadingMessage('processing_prompt', { 
        template: 'memorial',
        version: '1.0'
      });
      expect(message).toBe('Processing memorial template (v1.0)...');
    });

    test('should handle validation stage message', () => {
      const message = updateLoadingMessage('validating', {
        stage: 'type validation'
      });
      expect(message).toBe('Validating data types...');
    });
  });
}); 