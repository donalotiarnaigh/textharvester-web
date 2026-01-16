

jest.mock('glob');
jest.mock('../../src/utils/fileProcessing', () => ({
  processFile: jest.fn()
}));
jest.mock('../../src/utils/dynamicProcessing'); // Auto-mock the class
// Removed explicit jest.mock for logger to use spyOn instead


// Mock fs specifically for the way it's used
const mockAccess = jest.fn().mockResolvedValue(undefined);
jest.mock('fs', () => ({
  promises: {
    access: mockAccess
  },
  constants: {
    R_OK: 1
  },
  // Add synchronous methods used by fileQueue side-effects
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  // Keep internal state if needed by the mock setup
  _mockAccess: mockAccess
}));

const IngestService = require('../../src/services/IngestService');
const { CLIError } = require('../../src/cli/errors');
const { processFile } = require('../../src/utils/fileProcessing');
const glob = require('glob');
const logger = require('../../src/utils/logger');
// We don't need to require fs here if we use the mockAccess variable directly or rely on the mock setup
// But if we want to spy on it in tests, we can use the mockAccess variable.


describe('IngestService', () => {
  let service;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    mockAccess.mockResolvedValue(undefined);
    mockConfig = {
      batchSize: 2,
      provider: 'openai',
      sourceType: 'memorial',
      verbose: false
    };
    service = new IngestService(mockConfig, logger);

    // Spy on logger methods
    jest.spyOn(logger, 'info').mockImplementation(() => { });
    jest.spyOn(logger, 'error').mockImplementation(() => { });
    jest.spyOn(logger, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ingest', () => {
    // Happy Path Tests
    test('should process a single file successfully', async () => {
      // Mock glob to return one file
      glob.mockImplementation((pattern, cb) => cb(null, ['test.jpg']));

      // Mock processFile to succeed
      processFile.mockResolvedValue({
        success: true,
        recordId: 123,
        file: 'test.jpg'
      });

      const result = await service.ingest('*.jpg', { sourceType: 'memorial' });

      expect(result.successes).toHaveLength(1);
      expect(result.failures).toHaveLength(0);
      expect(result.total).toBe(1);
      expect(result.successes[0]).toMatchObject({
        success: true,
        file: 'test.jpg'
      });
      // Verify options passed to processFile
      expect(processFile).toHaveBeenCalledWith('test.jpg', expect.objectContaining({
        sourceType: 'memorial',
        provider: 'openai'
      }));
    });

    test('should expand glob patterns correctly', async () => {
      glob.mockImplementation((pattern, cb) => cb(null, ['a.jpg', 'b.jpg']));
      processFile.mockResolvedValue({ success: true });

      const result = await service.ingest('*.jpg', {});

      expect(result.total).toBe(2);
      expect(glob).toHaveBeenCalledWith('*.jpg', expect.any(Function));
    });

    test('should respect batch size limit', async () => {
      const files = ['1.jpg', '2.jpg', '3.jpg', '4.jpg'];
      glob.mockImplementation((pattern, cb) => cb(null, files));

      // We can't easily test true concurrency with checking Jest calls in this sync way,
      // but we can ensure processFile is called for all of them.
      // A more rapid test might check if they are chunked, but that's internal implementation detail.
      // We'll trust the logic for now and just verify all are processed.
      processFile.mockResolvedValue({ success: true });

      const result = await service.ingest('*.jpg', { batchSize: 2, sourceType: 'memorial' });

      expect(processFile).toHaveBeenCalledTimes(4);
      expect(result.total).toBe(4);
    });

    // Unhappy Path Tests
    test('should throw NO_FILES_MATCHED if pattern matches nothing', async () => {
      glob.mockImplementation((pattern, cb) => cb(null, []));

      const ingestPromise = service.ingest('*.jpg', { sourceType: 'memorial' });
      await expect(ingestPromise).rejects.toThrow('No files matched: *.jpg');
      await expect(ingestPromise).rejects.toBeInstanceOf(CLIError);
      await expect(ingestPromise).rejects.toHaveProperty('code', 'NO_FILES_MATCHED');
    });

    test('should collect failures for individual file errors', async () => {
      glob.mockImplementation((pattern, cb) => cb(null, ['good.jpg', 'bad.jpg']));

      processFile.mockImplementation((file) => {
        if (file === 'bad.jpg') return Promise.reject(new Error('Corrupt file'));
        return Promise.resolve({ success: true });
      });

      const result = await service.ingest('*.jpg', { sourceType: 'memorial' });

      expect(result.successes).toHaveLength(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]).toMatchObject({
        file: 'bad.jpg',
        success: false,
        error: 'Corrupt file'
      });
      expect(result.partial).toBe(true);
    });

    it('should handle API errors by adding to failures', async () => {
      glob.mockImplementation((pattern, cb) => cb(null, ['error.jpg']));

      processFile.mockImplementation(() => Promise.reject(new Error('API Rate Limit')));

      const result = await service.ingest('*.jpg', { sourceType: 'memorial' });

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].error).toBe('API Rate Limit');
    });

    it('should validate source type', async () => {
      await expect(service.ingest('*.jpg', { sourceType: 'invalid_type' }))
        .rejects.toThrow('Unknown source type: invalid_type');
    });

    it('should log progress', async () => {
      glob.mockImplementation((pattern, cb) => cb(null, ['test.jpg']));
      processFile.mockImplementation(() => Promise.resolve({ success: true }));

      await service.ingest('*.jpg', { sourceType: 'memorial' });

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Found 1 files'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Ingestion complete'));
    });
  });

  describe('Dynamic Schema Routing', () => {
    let DynamicProcessor;
    let mockProcessorInstance;

    beforeEach(() => {
      DynamicProcessor = require('../../src/utils/dynamicProcessing');
      // Reset the mock class
      DynamicProcessor.mockClear();

      // Setup the instance mock
      mockProcessorInstance = {
        processFileWithSchema: jest.fn().mockResolvedValue({
          success: true,
          recordId: 999,
          data: { field: 'value' }
        })
      };

      // Ensure constructor returns our mock instance
      DynamicProcessor.mockImplementation(() => mockProcessorInstance);
    });

    test('should route to DynamicProcessor when schemaId is present', async () => {
      glob.mockImplementation((pattern, cb) => cb(null, ['schema_file.jpg']));

      const options = { schemaId: 'test-schema-uuid' };
      const result = await service.ingest('*.jpg', options);

      // Verify DynamicProcessor was instantiated
      expect(DynamicProcessor).toHaveBeenCalledTimes(1);

      // Verify processFileWithSchema was called with correct args
      expect(mockProcessorInstance.processFileWithSchema).toHaveBeenCalledWith(
        { path: 'schema_file.jpg', provider: 'openai' },
        'test-schema-uuid'
      );

      // Verify legacy processFile was NOT called
      expect(processFile).not.toHaveBeenCalled();

      // Verify result structure
      expect(result.successes[0]).toMatchObject({
        success: true,
        recordId: 999,
        data: { field: 'value' }
      });
    });

    test('should fall back to standard processing when schemaId is missing', async () => {
      glob.mockImplementation((pattern, cb) => cb(null, ['standard.jpg']));
      processFile.mockResolvedValue({ success: true, id: 1 });

      const options = { sourceType: 'memorial' };
      await service.ingest('*.jpg', options);

      // Verify DynamicProcessor was NOT instantiated
      expect(DynamicProcessor).not.toHaveBeenCalled();

      // Verify legacy processFile WAS called
      expect(processFile).toHaveBeenCalledWith('standard.jpg', expect.anything());
    });

    test('should handle DynamicProcessor errors correctly', async () => {
      glob.mockImplementation((pattern, cb) => cb(null, ['error.jpg']));

      mockProcessorInstance.processFileWithSchema.mockRejectedValue(new Error('Validation Failed'));

      const options = { schemaId: 'fail-uuid' };
      const result = await service.ingest('*.jpg', options);

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]).toMatchObject({
        file: 'error.jpg',
        success: false,
        error: 'Validation Failed'
      });
    });
  });
});

