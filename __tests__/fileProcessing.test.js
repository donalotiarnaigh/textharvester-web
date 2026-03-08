// Mock dependencies
const mockFs = {
  promises: {
    readFile: jest.fn(),
    unlink: jest.fn()
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
};

// Mock functions
const mockGetProviderPrompt = jest.fn().mockReturnValue('test prompt');
const mockValidateAndConvert = jest.fn();
const mockProcessImage = jest.fn();
const mockGetModelVersion = jest.fn().mockReturnValue('test-model-v1');

// Store original env
const originalEnv = process.env;

jest.mock('fs', () => mockFs);
jest.mock('../src/utils/modelProviders', () => ({
  createProvider: jest.fn().mockReturnValue({
    processImage: mockProcessImage,
    getModelVersion: mockGetModelVersion
  })
}));
jest.mock('../src/utils/database', () => ({
  storeMemorial: jest.fn()
}));
jest.mock('../src/utils/prompts/templates/providerTemplates', () => ({
  getPrompt: jest.fn().mockReturnValue({
    getProviderPrompt: mockGetProviderPrompt,
    validateAndConvert: mockValidateAndConvert,
    version: '1.0'
  })
}));
jest.mock('../src/utils/logger');
jest.mock('../src/utils/imageProcessor', () => ({
  analyzeImageForProvider: jest.fn().mockResolvedValue({
    needsOptimization: false,
    reasons: []
  }),
  optimizeImageForProvider: jest.fn().mockResolvedValue('optimized-base64-data')
}));
jest.mock('../src/utils/graveCardStorage', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  storeGraveCard: jest.fn().mockResolvedValue(1),
  exportCardsToCsv: jest.fn().mockResolvedValue('')
}));
jest.mock('../src/utils/imageProcessing/graveCardProcessor', () => ({
  processPdf: jest.fn().mockResolvedValue(Buffer.from('stitched-image-data'))
}));
jest.mock('../../config.json', () => ({
  dbPath: 'test/db',
  uploadPath: 'test/uploads'
}), { virtual: true });

const { processFile } = require('../src/utils/fileProcessing.js');
const { createProvider } = require('../src/utils/modelProviders');
const { storeMemorial } = require('../src/utils/database');
const { getPrompt } = require('../src/utils/prompts/templates/providerTemplates');

describe('File Processing Module', () => {
  const mockBase64Image = 'base64encodedimage';
  const mockFilePath = 'test/image.jpg';
  const mockExtractedData = {
    memorial_number: '123',
    first_name: 'John',
    last_name: 'Doe',
    year_of_death: '1900',
    inscription: 'Test inscription'
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Reset env
    process.env = { ...originalEnv };
    delete process.env.AI_PROVIDER;

    // Setup default mock implementations
    mockFs.promises.readFile.mockResolvedValue(mockBase64Image);
    mockFs.promises.unlink.mockResolvedValue();
    mockProcessImage.mockResolvedValue({ content: mockExtractedData, usage: { input_tokens: 0, output_tokens: 0 } });
    mockValidateAndConvert.mockReturnValue(mockExtractedData);
    storeMemorial.mockResolvedValue();
  });

  afterAll(() => {
    // Restore env
    process.env = originalEnv;
  });

  describe('Basic Functionality', () => {
    test('processes a file with default options', async () => {
      const result = await processFile(mockFilePath);

      expect(result).toEqual(expect.objectContaining({
        memorial_number: '123',
        first_name: 'John',
        last_name: 'Doe',
        year_of_death: '1900',
        inscription: 'Test inscription',
        fileName: 'image.jpg',
        ai_provider: 'openai',
        model_version: 'test-model-v1',
        prompt_version: '1.0'
      }));

      expect(mockFs.promises.readFile).toHaveBeenCalledWith(mockFilePath, { encoding: 'base64' });
      expect(createProvider).toHaveBeenCalled();
      expect(storeMemorial).toHaveBeenCalled();
      expect(mockFs.promises.unlink).toHaveBeenCalledWith(mockFilePath);
    });

    test('uses specified provider from options', async () => {
      await processFile(mockFilePath, { provider: 'anthropic' });

      expect(createProvider).toHaveBeenCalledWith(expect.objectContaining({
        AI_PROVIDER: 'anthropic'
      }));
    });

    test('uses provider from environment variable', async () => {
      process.env.AI_PROVIDER = 'anthropic';
      const result = await processFile(mockFilePath);

      expect(result.ai_provider).toBe('anthropic');
      expect(createProvider).toHaveBeenCalledWith(expect.objectContaining({
        AI_PROVIDER: 'anthropic'
      }));
    });

    test('routes to typographic analysis prompt when source type matches', async () => {
      await processFile(mockFilePath, { sourceType: 'typographic_analysis' });

      expect(getPrompt).toHaveBeenCalledWith('openai', 'typographicAnalysis', 'latest');
    });
  });

  describe('Error Handling', () => {
    test('handles file read errors', async () => {
      mockFs.promises.readFile.mockRejectedValue(new Error('File not found'));

      await expect(processFile(mockFilePath))
        .rejects
        .toThrow('File not found');
    });

    test('handles provider processing errors', async () => {
      mockProcessImage.mockRejectedValue(new Error('API error'));

      await expect(processFile(mockFilePath))
        .rejects
        .toThrow('API error');
    });

    test('handles database storage errors', async () => {
      storeMemorial.mockRejectedValue(new Error('Database error'));

      await expect(processFile(mockFilePath))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('Data Validation', () => {
    test('validates and converts extracted data', async () => {
      const mockRawData = {
        memorial_number: '123',
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: '1900',
        inscription: 'RAW INSCRIPTION'
      };

      mockProcessImage.mockResolvedValue({ content: mockRawData, usage: { input_tokens: 0, output_tokens: 0 } });

      await processFile(mockFilePath);

      expect(getPrompt).toHaveBeenCalled();
      expect(mockValidateAndConvert).toHaveBeenCalledWith(mockRawData);
    });
  });

  describe('Monument photo: memorial number injection', () => {
    // filename 'stja-0006_1757350406869.jpg' → getMemorialNumberForMonument extracts '0006'
    const monumentFilePath = 'test/stja-0006_1757350406869.jpg';
    const expectedInjectedNumber = '0006';
    const baseValidatedResult = { first_name: 'JOHN', last_name: 'DOE' };

    beforeEach(() => {
      mockFs.promises.readFile.mockResolvedValue(mockBase64Image);
      mockFs.promises.unlink.mockResolvedValue();
      mockValidateAndConvert.mockReturnValue(baseValidatedResult);
      storeMemorial.mockResolvedValue();
    });

    test('injects filename number when OCR returns null', async () => {
      mockProcessImage.mockResolvedValue({ content: { memorial_number: null, first_name: 'JOHN' }, usage: { input_tokens: 0, output_tokens: 0 } });
      await processFile(monumentFilePath, { sourceType: 'monument_photo' });
      const data = mockValidateAndConvert.mock.calls[0][0];
      expect(data.memorial_number).toBe(expectedInjectedNumber);
    });

    test('injects filename number when OCR returns "N/A" placeholder', async () => {
      mockProcessImage.mockResolvedValue({ content: { memorial_number: 'N/A', first_name: 'JOHN' }, usage: { input_tokens: 0, output_tokens: 0 } });
      await processFile(monumentFilePath, { sourceType: 'monument_photo' });
      const data = mockValidateAndConvert.mock.calls[0][0];
      expect(data.memorial_number).toBe(expectedInjectedNumber);
    });

    test('injects filename number when OCR returns lowercase "n/a"', async () => {
      mockProcessImage.mockResolvedValue({ content: { memorial_number: 'n/a', first_name: 'JOHN' }, usage: { input_tokens: 0, output_tokens: 0 } });
      await processFile(monumentFilePath, { sourceType: 'monument_photo' });
      const data = mockValidateAndConvert.mock.calls[0][0];
      expect(data.memorial_number).toBe(expectedInjectedNumber);
    });

    test('injects filename number when OCR returns confidence wrapper with null value', async () => {
      mockProcessImage.mockResolvedValue({
        content: { memorial_number: { value: null, confidence: 0.3 }, first_name: 'JOHN' },
        usage: { input_tokens: 0, output_tokens: 0 }
      });
      await processFile(monumentFilePath, { sourceType: 'monument_photo' });
      const data = mockValidateAndConvert.mock.calls[0][0];
      expect(data.memorial_number).toBe(expectedInjectedNumber);
    });

    test('injects filename number when OCR returns confidence wrapper with "N/A" value', async () => {
      mockProcessImage.mockResolvedValue({
        content: { memorial_number: { value: 'N/A', confidence: 0.2 }, first_name: 'JOHN' },
        usage: { input_tokens: 0, output_tokens: 0 }
      });
      await processFile(monumentFilePath, { sourceType: 'monument_photo' });
      const data = mockValidateAndConvert.mock.calls[0][0];
      expect(data.memorial_number).toBe(expectedInjectedNumber);
    });

    test('preserves valid OCR memorial number (plain string)', async () => {
      mockProcessImage.mockResolvedValue({ content: { memorial_number: '42', first_name: 'JOHN' }, usage: { input_tokens: 0, output_tokens: 0 } });
      await processFile(monumentFilePath, { sourceType: 'monument_photo' });
      const data = mockValidateAndConvert.mock.calls[0][0];
      expect(data.memorial_number).toBe('42');
    });

    test('preserves valid OCR memorial number from confidence wrapper', async () => {
      mockProcessImage.mockResolvedValue({
        content: { memorial_number: { value: '42', confidence: 0.85 }, first_name: 'JOHN' },
        usage: { input_tokens: 0, output_tokens: 0 }
      });
      await processFile(monumentFilePath, { sourceType: 'monument_photo' });
      const data = mockValidateAndConvert.mock.calls[0][0];
      expect(data.memorial_number).toEqual({ value: '42', confidence: 0.85 });
    });
  });

  describe('Validation failure retry', () => {
    const testFilePath = 'test/image.jpg';

    beforeEach(() => {
      mockFs.promises.readFile.mockResolvedValue(mockBase64Image);
      mockFs.promises.unlink.mockResolvedValue();
      storeMemorial.mockResolvedValue();
    });

    test('retries on validation failure and succeeds on second attempt', async () => {
      const validationError = new Error('Invalid JSON');
      mockValidateAndConvert
        .mockImplementationOnce(() => {
          throw validationError;
        })
        .mockImplementationOnce(() => mockExtractedData);

      mockProcessImage.mockResolvedValue({ content: mockExtractedData, usage: { input_tokens: 0, output_tokens: 0 } });

      const result = await processFile(testFilePath);

      expect(result).toEqual(expect.objectContaining(mockExtractedData));
      expect(mockProcessImage).toHaveBeenCalledTimes(2);
      expect(mockValidateAndConvert).toHaveBeenCalledTimes(2);
    });

    test('retry prompt includes format-enforcement preamble', async () => {
      const validationError = new Error('Parse error');
      mockValidateAndConvert
        .mockImplementationOnce(() => {
          throw validationError;
        })
        .mockImplementationOnce(() => mockExtractedData);

      mockProcessImage.mockResolvedValue({ content: mockExtractedData, usage: { input_tokens: 0, output_tokens: 0 } });

      await processFile(testFilePath);

      // Check that the second call to processImage includes the preamble
      const secondCall = mockProcessImage.mock.calls[1];
      expect(secondCall[1]).toContain('IMPORTANT: Your previous response could not be parsed');
      expect(secondCall[1]).toContain('Return ONLY valid JSON');
    });

    test('both attempts fail — error is thrown', async () => {
      const validationError = new Error('Persistent validation failure');
      mockValidateAndConvert.mockImplementation(() => {
        throw validationError;
      });

      mockProcessImage.mockResolvedValue({ content: mockExtractedData, usage: { input_tokens: 0, output_tokens: 0 } });

      await expect(processFile(testFilePath)).rejects.toThrow('Persistent validation failure');
      expect(mockProcessImage).toHaveBeenCalledTimes(2);
      expect(mockValidateAndConvert).toHaveBeenCalledTimes(2);
    });

    test('empty sheet error is NOT retried', async () => {
      const emptySheetError = new Error('No readable text found');
      emptySheetError.type = 'empty_sheet';
      mockValidateAndConvert.mockImplementation(() => {
        throw emptySheetError;
      });

      mockProcessImage.mockResolvedValue({ content: mockExtractedData, usage: { input_tokens: 0, output_tokens: 0 } });

      const result = await processFile(testFilePath);

      expect(result).toEqual(expect.objectContaining({
        error: true,
        errorType: 'empty_sheet'
      }));
      expect(mockProcessImage).toHaveBeenCalledTimes(1);
      expect(mockValidateAndConvert).toHaveBeenCalledTimes(1);
    });

    test('grave card retries on validation failure', async () => {
      const graveCardProcessor = require('../src/utils/imageProcessing/graveCardProcessor');
      const graveCardStorage = require('../src/utils/graveCardStorage');
      const gravCardData = { burial_date: '2020-01-01', first_name: 'John' };

      const validationError = new Error('Invalid grave card format');
      mockValidateAndConvert
        .mockImplementationOnce(() => {
          throw validationError;
        })
        .mockImplementationOnce(() => gravCardData);

      mockProcessImage.mockResolvedValue({ content: gravCardData, usage: { input_tokens: 100, output_tokens: 50 } });

      const result = await processFile('test/grave.pdf', { sourceType: 'grave_record_card' });

      expect(result).toEqual(expect.objectContaining(gravCardData));
      expect(mockProcessImage).toHaveBeenCalledTimes(2);
      expect(mockValidateAndConvert).toHaveBeenCalledTimes(2);
      expect(graveCardStorage.storeGraveCard).toHaveBeenCalled();
    });
  });
}); 