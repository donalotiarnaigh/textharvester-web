// Mock dependencies - MUST BE DEFINED BEFORE IMPORTS
jest.mock('../../src/services/SchemaManager');
jest.mock('../../src/utils/database', () => ({
  db: {
    run: jest.fn(),
  },
}));
jest.mock('../../src/utils/modelProviders');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../src/utils/imageProcessor');
jest.mock('fs', () => {
  const originalModule = jest.requireActual('fs');
  return {
    ...originalModule,
    promises: {
      ...originalModule.promises,
      readFile: jest.fn(),
      unlink: jest.fn(),
    },
  };
});
jest.mock('../../src/utils/pdfConverter', () => ({
  convertPdfToJpegs: jest.fn(),
}));

const DynamicProcessor = require('../../src/utils/dynamicProcessing');
const SchemaManager = require('../../src/services/SchemaManager');
const { db } = require('../../src/utils/database');
const { createProvider } = require('../../src/utils/modelProviders');
const logger = require('../../src/utils/logger');
const { analyzeImageForProvider, optimizeImageForProvider } = require('../../src/utils/imageProcessor');
const fs = require('fs').promises;
const { convertPdfToJpegs } = require('../../src/utils/pdfConverter');

describe('DynamicProcessor', () => {
  let processor;
  let mockProvider;

  const mockSchema = {
    id: 'test-schema-id',
    name: 'Test Schema',
    table_name: 'custom_test_table',
    json_schema: {
      type: 'object',
      properties: {
        field1: { type: 'string' },
        field2: { type: 'number' },
      },
      required: ['field1'],
    },
    system_prompt: 'System Prompt',
    user_prompt_template: 'User Prompt Template',
  };

  const mockFile = {
    path: '/tmp/test.jpg',
    filename: 'test.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock provider
    mockProvider = {
      processImage: jest.fn(),
      getModelVersion: jest.fn().mockReturnValue('gpt-4-test'),
    };
    createProvider.mockReturnValue(mockProvider);

    // Setup FS and Image Processor mocks
    fs.readFile.mockResolvedValue('mock-base64-content');
    analyzeImageForProvider.mockResolvedValue({ needsOptimization: false });
    optimizeImageForProvider.mockResolvedValue('optimized-base64-content');

    // Setup PDF mock
    convertPdfToJpegs.mockResolvedValue(['/tmp/page1.jpg']);

    const logger = require('../../src/utils/logger');
    processor = new DynamicProcessor(logger);
  });

  /* 
     * Happy Path: Valid schema ID, LLM returns valid JSON, DB insert succeeds.
     */
  test('processFileWithSchema successfully extracts and stores data', async () => {
    // 1. Mock SchemaManager to return a schema
    SchemaManager.getSchema.mockResolvedValue(mockSchema);

    // 2. Mock LLM response (valid JSON matching schema)
    const validLLMResponse = JSON.stringify({
      field1: 'value1',
      field2: 123,
    });
    mockProvider.processImage.mockResolvedValue(validLLMResponse);

    // 3. Mock DB insert success
    db.run.mockImplementation((sql, params, callback) => {
      callback.call({ lastID: 1 }, null); // Success with context
    });

    // Execute
    const result = await processor.processFileWithSchema(mockFile, 'test-schema-id');

    // Verify Schema Fetch
    expect(SchemaManager.getSchema).toHaveBeenCalledWith('test-schema-id');

    // Verify File Read (since needsOptimization=false)
    expect(fs.readFile).toHaveBeenCalledWith('/tmp/test.jpg', { encoding: 'base64' });

    // Verify LLM Call
    expect(createProvider).toHaveBeenCalled();
    expect(mockProvider.processImage).toHaveBeenCalledWith('mock-base64-content', expect.any(String), expect.any(Object));

    // Verify DB Insert
    const expectedSqlFragment = 'INSERT INTO custom_test_table';
    expect(db.run).toHaveBeenCalledWith(expect.stringContaining(expectedSqlFragment), expect.any(Array), expect.any(Function));

    // Verify Result
    // Verify Result
    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      field1: 'value1',
      field2: 123,
    });
  });

  /*
     * Observability: LLM returns JSON missing required field -> Validation Error
     * Should log specific details for debugging.
     */
  test('processFileWithSchema logs comprehensive details on validation failure', async () => {
    SchemaManager.getSchema.mockResolvedValue(mockSchema);

    // Invalid: missing 'field1' which is required
    const invalidLLMResponse = JSON.stringify({
      field2: 123
    });
    mockProvider.processImage.mockResolvedValue(invalidLLMResponse);

    // Execute and Expect Error
    await expect(processor.processFileWithSchema(mockFile, 'test-schema-id'))
      .rejects.toThrow(/Validation failed/);

    // Verify Logging (Observability)
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Validation failed'), expect.objectContaining({
      schemaId: 'test-schema-id',
      validationErrors: expect.any(Array),
      rawValue: expect.any(Object)
    }));
  });

  /*
     * Unhappy Path: Schema ID not found
     */
  test('processFileWithSchema throws error if schema not found', async () => {
    SchemaManager.getSchema.mockResolvedValue(null);

    await expect(processor.processFileWithSchema(mockFile, 'non-existent-id'))
      .rejects.toThrow('Invalid Schema ID');

    expect(mockProvider.processImage).not.toHaveBeenCalled();
  });

  /*
     * Unhappy Path: SQL Error during insertion
     */
  test('processFileWithSchema throws and logs if DB insert fails', async () => {
    SchemaManager.getSchema.mockResolvedValue(mockSchema);
    mockProvider.processImage.mockResolvedValue(JSON.stringify({ field1: 'val', field2: 1 }));

    // Mock DB failure
    const dbError = new Error('SQL Constraint Violation');
    db.run.mockImplementation((sql, params, callback) => {
      callback(dbError);
    });

    await expect(processor.processFileWithSchema(mockFile, 'test-schema-id'))
      .rejects.toThrow('SQL Constraint Violation');

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Database insertion failed'), expect.any(Object));
  });

  /*
   * Feature: Handle multi-record extraction (Array)
   * Schema expects single object, but LLM returns { input: [obj1, obj2] } or [obj1, obj2]
   */
  test('processFileWithSchema handles nested array output (multi-record)', async () => {
    SchemaManager.getSchema.mockResolvedValue(mockSchema);

    // LLM returns nested array instead of single object
    const nestedResponse = JSON.stringify({
      entries: [
        { field1: 'Record A', field2: 10 },
        { field1: 'Record B', field2: 20 }
      ]
    });
    mockProvider.processImage.mockResolvedValue(nestedResponse);

    // Mock DB insert success for multiple calls
    db.run.mockImplementation((sql, params, callback) => {
      callback.call({ lastID: 123 }, null);
    });

    const result = await processor.processFileWithSchema(mockFile, 'test-schema-id');

    // Should detect array and validate each
    expect(result.success).toBe(true);
    // expect(result.recordCount).toBe(2); // We expect this property in new implementation
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({ field1: 'Record A' });
    expect(result.data[1]).toMatchObject({ field1: 'Record B' });

    // DB should have been called twice
    expect(db.run).toHaveBeenCalledTimes(2);
  });

  /*
     * Feature: Handle multi-record extraction with deeply nested context
     * Schema requires fields that are distributed across hierarchy in LLM output
     */
  test('processFileWithSchema merges context from parent objects into nested array records', async () => {
    SchemaManager.getSchema.mockResolvedValue({
      ...mockSchema,
      json_schema: {
        type: 'object',
        properties: {
          topField: { type: 'string' },
          midField: { type: 'string' },
          itemField: { type: 'string' }
        },
        required: ['topField', 'midField', 'itemField']
      }
    });

    const nestedResponse = JSON.stringify({
      topField: 'TOP',
      middle: {
        midField: 'MID',
        entries: [
          { itemField: 'ITEM1' },
          { itemField: 'ITEM2' }
        ]
      }
    });
    mockProvider.processImage.mockResolvedValue(nestedResponse);

    // Mock DB insert
    db.run.mockImplementation((sql, params, callback) => callback.call({ lastID: 999 }, null));

    const result = await processor.processFileWithSchema(mockFile, 'test-schema-id');

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({
      topField: 'TOP',
      midField: 'MID',
      itemField: 'ITEM1'
    });
    expect(result.data[1]).toMatchObject({
      itemField: 'ITEM2'
    });
  });
});
