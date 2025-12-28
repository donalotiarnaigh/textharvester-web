const SchemaGenerator = require('../../src/services/SchemaGenerator');
const fs = require('fs');
const path = require('path');

// Mock fs to avoid actual file system calls
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-image-content')),
  promises: {
    unlink: jest.fn().mockResolvedValue(),
  },
  existsSync: jest.fn().mockReturnValue(true),
}));

// Mock pdfConverter
jest.mock('../../src/utils/pdfConverter', () => ({
  convertPdfToJpegs: jest.fn().mockResolvedValue(['/path/to/page1.jpg'])
}));

describe('SchemaGenerator', () => {
  let schemaGenerator;
  let mockLlmProvider;

  beforeEach(() => {
    mockLlmProvider = {
      processImage: jest.fn()
    };
    schemaGenerator = new SchemaGenerator(mockLlmProvider);
    jest.clearAllMocks();
  });

  describe('generateSchema', () => {
    it('should include the system prompt in the analysis request', async () => {
      mockLlmProvider.processImage.mockResolvedValue(JSON.stringify({ tableName: 'test', fields: [] }));

      await schemaGenerator.generateSchema(['/path/to/img.jpg']);

      const calls = mockLlmProvider.processImage.mock.calls;
      // Arg 0: Base64 image
      expect(calls[0][0]).toBe(Buffer.from('fake-image-content').toString('base64'));
      // Arg 1: Prompt
      expect(calls[0][1]).toContain('You are an expert data architect');
      expect(calls[0][1]).toContain('JSON Schema');
      // Arg 2: Options
      expect(calls[0][2]).toEqual({ raw: true });
    });

    it('should return a valid schema definition when LLM returns valid JSON', async () => {
      const mockLlmResponse = JSON.stringify({
        tableName: 'My Document',
        fields: [
          { name: 'date', type: 'date', description: 'Date of document' },
          { name: 'amount', type: 'number', description: 'Total amount' }
        ]
      });
      mockLlmProvider.processImage.mockResolvedValue(mockLlmResponse);

      const result = await schemaGenerator.generateSchema(['/path/to/image1.jpg']);

      expect(result).toHaveProperty('tableName', 'custom_my_document');
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0]).toHaveProperty('name', 'date');
      expect(result.fields[0]).toHaveProperty('type', 'date');
    });

    it('should sanitize table and field names to be SQL-safe', async () => {
      const mockLlmResponse = JSON.stringify({
        tableName: 'User Table; DROP TABLE users;',
        fields: [
          { name: 'select', type: 'string', description: 'SQL keyword' },
          { name: 'valid-field', type: 'number', description: 'Hyphenated' }
        ]
      });
      mockLlmProvider.processImage.mockResolvedValue(mockLlmResponse);

      const result = await schemaGenerator.generateSchema(['/path/to/image1.jpg']);

      expect(result.tableName).toMatch(/^[a-z0-9_]+$/);
      expect(result.tableName).toContain('user_table');

      const fieldNames = result.fields.map(f => f.name);
      expect(fieldNames).toContain('extracted_select'); // Sanitized keyword
      expect(fieldNames).toContain('valid_field'); // Sanitized hyphen
    });

    it('should throw error when LLM returns invalid JSON', async () => {
      mockLlmProvider.processImage.mockResolvedValue('Not JSON');

      await expect(schemaGenerator.generateSchema(['/path/to/image1.jpg']))
        .rejects.toThrow('Failed to parse LLM response');
    });

    it('should throw error when LLM cannot find consistent structure', async () => {
      mockLlmProvider.processImage.mockResolvedValue(JSON.stringify({ error: 'No structure found' }));

      await expect(schemaGenerator.generateSchema(['/path/to/image1.jpg']))
        .rejects.toThrow('No consistent structure found');
    });
  });
});
