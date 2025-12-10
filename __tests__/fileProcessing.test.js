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
jest.mock('../../config.json', () => ({
  dbPath: 'test/db',
  uploadPath: 'test/uploads'
}), { virtual: true });

const path = require('path');
const { processFile } = require('../src/utils/fileProcessing');
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
    mockProcessImage.mockResolvedValue(mockExtractedData);
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
      
      expect(result).toEqual({
        ...mockExtractedData,
        fileName: 'image.jpg',
        ai_provider: 'openai',
        model_version: 'test-model-v1',
        prompt_version: '1.0'
      });
      
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
      
      mockProcessImage.mockResolvedValue(mockRawData);
      
      await processFile(mockFilePath);
      
      expect(getPrompt).toHaveBeenCalled();
      expect(mockValidateAndConvert).toHaveBeenCalledWith(mockRawData);
    });
  });
}); 