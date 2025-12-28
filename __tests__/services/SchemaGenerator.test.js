const SchemaGenerator = require('../../src/services/SchemaGenerator');

describe('SchemaGenerator', () => {
  let schemaGenerator;
  let mockLlmProvider;

  beforeEach(() => {
    mockLlmProvider = {
      analyzeImages: jest.fn()
    };
    schemaGenerator = new SchemaGenerator(mockLlmProvider);
  });

  describe('generateSchema', () => {
    it('should include the system prompt in the analysis request', async () => {
      mockLlmProvider.analyzeImages.mockResolvedValue(JSON.stringify({ tableName: 'test', fields: [] }));

      await schemaGenerator.generateSchema(['/path/to/img.jpg']);

      const calls = mockLlmProvider.analyzeImages.mock.calls;
      expect(calls[0][0]).toContain('You are an expert data architect'); // Expecting part of system prompt
      expect(calls[0][0]).toContain('JSON Schema');
      expect(calls[0][1]).toEqual(['/path/to/img.jpg']);
    });

    it('should return a valid schema definition when LLM returns valid JSON', async () => {
      const mockLlmResponse = JSON.stringify({
        tableName: 'My Document',
        fields: [
          { name: 'date', type: 'date', description: 'Date of document' },
          { name: 'amount', type: 'number', description: 'Total amount' }
        ]
      });
      mockLlmProvider.analyzeImages.mockResolvedValue(mockLlmResponse);

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
      mockLlmProvider.analyzeImages.mockResolvedValue(mockLlmResponse);

      const result = await schemaGenerator.generateSchema(['/path/to/image1.jpg']);

      expect(result.tableName).toMatch(/^[a-z0-9_]+$/);
      expect(result.tableName).toContain('user_table');

      const fieldNames = result.fields.map(f => f.name);
      expect(fieldNames).toContain('extracted_select'); // Sanitized keyword
      expect(fieldNames).toContain('valid_field'); // Sanitized hyphen
    });

    it('should throw SchemaGenerationError when LLM returns invalid JSON', async () => {
      mockLlmProvider.analyzeImages.mockResolvedValue('Not JSON');

      await expect(schemaGenerator.generateSchema(['/path/to/image1.jpg']))
        .rejects.toThrow('Failed to parse LLM response');
    });

    it('should throw error when LLM cannot find consistent structure', async () => {
      // Assuming specific response structure or error code from LLM service for "no structure"
      // For now, we simulate this via a specific JSON response or error
      mockLlmProvider.analyzeImages.mockResolvedValue(JSON.stringify({ error: 'No structure found' }));

      await expect(schemaGenerator.generateSchema(['/path/to/image1.jpg']))
        .rejects.toThrow('No consistent structure found');
    });
  });
});
