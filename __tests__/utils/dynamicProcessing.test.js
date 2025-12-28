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
    },
  };
});

const DynamicProcessor = require('../../src/utils/dynamicProcessing');
const SchemaManager = require('../../src/services/SchemaManager');
const { db } = require('../../src/utils/database');
const { createProvider } = require('../../src/utils/modelProviders');
const logger = require('../../src/utils/logger');
const { analyzeImageForProvider, optimizeImageForProvider } = require('../../src/utils/imageProcessor');
const fs = require('fs').promises;

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

    // Dependencies are now mocked by module path, but also need to pass instance if I want explicit control
    // But require('logger') in test still returns the mocked object.
    // So if I pass that, it works.
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
    expect(result).toEqual({
      success: true,
      recordId: 1,
      data: expect.objectContaining({
        field1: 'value1',
        field2: 123,
      })
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
});
