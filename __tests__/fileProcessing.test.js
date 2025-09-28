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
const mockProviderImplementations = {};

const createProcessImageMock = (provider) => {
  if (!mockProviderImplementations[provider]) {
    mockProviderImplementations[provider] = {
      processImage: jest.fn(),
      getModelVersion: jest.fn().mockReturnValue(`${provider}-model-v1`)
    };
  }
  return mockProviderImplementations[provider];
};

// Store original env
const originalEnv = process.env;

jest.mock('fs', () => mockFs);
jest.mock('../src/utils/modelProviders', () => ({
  createProvider: jest.fn().mockImplementation(({ AI_PROVIDER }) => {
    return createProcessImageMock(AI_PROVIDER);
  })
}));
jest.mock('../src/utils/database', () => ({
  storeMemorial: jest.fn(),
  storeParallelMemorial: jest.fn()
}));
jest.mock('../src/utils/prompts/templates/providerTemplates', () => ({
  getPrompt: jest.fn().mockReturnValue({
    getProviderPrompt: mockGetProviderPrompt,
    validateAndConvert: mockValidateAndConvert,
    version: '1.0'
  })
}));
jest.mock('../src/utils/logger');
jest.mock('../../config.json', () => ({
  dbPath: 'test/db',
  uploadPath: 'test/uploads'
}), { virtual: true });

const path = require('path');
const { processFile } = require('../src/utils/fileProcessing');
const { createProvider } = require('../src/utils/modelProviders');
const { storeMemorial, storeParallelMemorial } = require('../src/utils/database');
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
    jest.clearAllMocks();

    process.env = { ...originalEnv };
    delete process.env.AI_PROVIDER;

    mockFs.promises.readFile.mockResolvedValue(mockBase64Image);
    mockFs.promises.unlink.mockResolvedValue();
    mockValidateAndConvert.mockReturnValue(mockExtractedData);
    storeMemorial.mockResolvedValue();
    storeParallelMemorial.mockResolvedValue();

    Object.keys(mockProviderImplementations).forEach((key) => {
      delete mockProviderImplementations[key];
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Single provider compatibility', () => {
    test('processes a file with default options', async () => {
      const openaiImpl = createProcessImageMock('openai');
      openaiImpl.processImage.mockResolvedValue(mockExtractedData);

      const result = await processFile(mockFilePath);

      expect(result).toEqual({
        ...mockExtractedData,
        fileName: 'image.jpg',
        ai_provider: 'openai',
        prompt_template: 'memorialOCR',
        model_version: 'openai-model-v1',
        prompt_version: '1.0'
      });

      expect(mockFs.promises.readFile).toHaveBeenCalledWith(mockFilePath, { encoding: 'base64' });
      expect(createProvider).toHaveBeenCalled();
      expect(storeMemorial).toHaveBeenCalled();
      expect(storeParallelMemorial).not.toHaveBeenCalled();
      expect(mockFs.promises.unlink).toHaveBeenCalledWith(mockFilePath);
    });

    test('uses specified provider from options', async () => {
      const anthropicImpl = createProcessImageMock('anthropic');
      anthropicImpl.processImage.mockResolvedValue(mockExtractedData);

      await processFile(mockFilePath, { provider: 'anthropic' });

      expect(createProvider).toHaveBeenCalledWith(expect.objectContaining({
        AI_PROVIDER: 'anthropic'
      }));
    });

    test('uses provider from environment variable', async () => {
      process.env.AI_PROVIDER = 'anthropic';
      const anthropicImpl = createProcessImageMock('anthropic');
      anthropicImpl.processImage.mockResolvedValue(mockExtractedData);

      const result = await processFile(mockFilePath);

      expect(result.ai_provider).toBe('anthropic');
      expect(createProvider).toHaveBeenCalledWith(expect.objectContaining({
        AI_PROVIDER: 'anthropic'
      }));
    });
  });

  describe('Error handling', () => {
    test('handles file read errors', async () => {
      mockFs.promises.readFile.mockRejectedValue(new Error('File not found'));

      await expect(processFile(mockFilePath))
        .rejects
        .toThrow('File not found');
    });

    test('handles provider processing errors', async () => {
      const openaiImpl = createProcessImageMock('openai');
      openaiImpl.processImage.mockRejectedValue(new Error('API error'));

      await expect(processFile(mockFilePath))
        .rejects
        .toThrow('API error');
    });

    test('handles database storage errors', async () => {
      const openaiImpl = createProcessImageMock('openai');
      openaiImpl.processImage.mockResolvedValue(mockExtractedData);
      storeMemorial.mockRejectedValue(new Error('Database error'));

      await expect(processFile(mockFilePath))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('Data validation', () => {
    test('validates and converts extracted data', async () => {
      const mockRawData = {
        memorial_number: '123',
        first_name: 'JOHN',
        last_name: 'DOE',
        year_of_death: '1900',
        inscription: 'RAW INSCRIPTION'
      };

      const openaiImpl = createProcessImageMock('openai');
      openaiImpl.processImage.mockResolvedValue(mockRawData);

      await processFile(mockFilePath);

      expect(getPrompt).toHaveBeenCalled();
      expect(mockValidateAndConvert).toHaveBeenCalledWith(mockRawData);
    });
  });

  describe('Parallel processing', () => {
    beforeEach(() => {
      process.env.PARALLEL_OCR = 'true';
    });

    afterEach(() => {
      delete process.env.PARALLEL_OCR;
    });

    test('processes multiple providers concurrently and stores combined result', async () => {
      const openaiImpl = createProcessImageMock('openai');
      const anthropicImpl = createProcessImageMock('anthropic');

      const openaiData = { ...mockExtractedData, memorial_number: 'O-1' };
      const anthropicData = { ...mockExtractedData, memorial_number: 'A-1' };

      openaiImpl.processImage.mockResolvedValue(openaiData);
      anthropicImpl.processImage.mockResolvedValue(anthropicData);
      mockValidateAndConvert
        .mockImplementationOnce(() => openaiData)
        .mockImplementationOnce(() => anthropicData);

      const result = await processFile(mockFilePath, {
        providers: ['openai', 'anthropic'],
        promptTemplate: 'memorialOCR',
        promptVersion: 'latest'
      });

      expect(mockFs.promises.readFile).toHaveBeenCalledTimes(1);
      expect(storeParallelMemorial).toHaveBeenCalledWith('image.jpg', expect.objectContaining({
        promptTemplate: 'memorialOCR',
        promptVersion: '1.0'
      }), expect.objectContaining({
        openai: expect.objectContaining({ status: 'success' }),
        anthropic: expect.objectContaining({ status: 'success' })
      }));
      expect(storeMemorial).not.toHaveBeenCalled();
      expect(result.providers.openai.data.memorial_number).toBe('O-1');
      expect(result.providers.anthropic.data.memorial_number).toBe('A-1');
    });

    test('captures errors per provider without blocking other results', async () => {
      const openaiImpl = createProcessImageMock('openai');
      const anthropicImpl = createProcessImageMock('anthropic');

      openaiImpl.processImage.mockResolvedValue(mockExtractedData);
      anthropicImpl.processImage.mockRejectedValue(new Error('Anthropic failure'));
      mockValidateAndConvert
        .mockImplementationOnce(() => mockExtractedData)
        .mockImplementationOnce(() => { throw new Error('Anthropic failure'); });

      const result = await processFile(mockFilePath, {
        providers: ['openai', 'anthropic'],
        promptTemplate: 'memorialOCR',
        promptVersion: 'latest'
      });

      expect(storeParallelMemorial).toHaveBeenCalledWith('image.jpg', expect.any(Object), expect.objectContaining({
        openai: expect.objectContaining({ status: 'success' }),
        anthropic: expect.objectContaining({ status: 'error', errorMessage: 'Anthropic failure' })
      }));
      expect(result.providers.anthropic.status).toBe('error');
      expect(result.providers.openai.status).toBe('success');
    });
  });
});
