const { processFile } = require('../fileProcessing');
const { ProcessingError } = require('../errorTypes');
const path = require('path');

// Mock dependencies
const fs = require('fs');
jest.mock('fs', () => {
  return {
    promises: {
      readFile: jest.fn().mockResolvedValue('base64Image'),
      unlink: jest.fn().mockResolvedValue(undefined)
    }
  };
});

jest.mock('../logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debugPayload: jest.fn()
}));

jest.mock('../database', () => ({
  storeMemorial: jest.fn().mockResolvedValue(true)
}));

jest.mock('../modelProviders', () => ({
  createProvider: jest.fn()
}));

jest.mock('../prompts/templates/providerTemplates', () => ({
  getPrompt: jest.fn()
}));

describe('Enhanced File Processing with Error Handling', () => {
  let mockProvider;
  let mockPrompt;
  let mockProviderResponse;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mocks
    mockProviderResponse = {
      memorial_number: 'HG-123',
      first_name: 'JOHN',
      last_name: 'DOE',
      year_of_death: 1950,
      inscription: 'Rest in peace'
    };
    
    mockProvider = {
      processImage: jest.fn().mockResolvedValue(mockProviderResponse),
      getModelVersion: jest.fn().mockReturnValue('mock-model-1.0')
    };
    
    mockPrompt = {
      getProviderPrompt: jest.fn().mockReturnValue({ systemPrompt: 'test', userPrompt: 'test' }),
      validateAndConvert: jest.fn().mockReturnValue(mockProviderResponse),
      version: '1.0.0'
    };
    
    // Setup module mocks
    const { createProvider } = require('../modelProviders');
    createProvider.mockReturnValue(mockProvider);
    
    const { getPrompt } = require('../prompts/templates/providerTemplates');
    getPrompt.mockReturnValue(mockPrompt);
  });
  
  it('should process a file successfully', async () => {
    const result = await processFile('test.jpg');
    
    expect(result).toEqual(expect.objectContaining({
      memorial_number: 'HG-123',
      first_name: 'JOHN',
      last_name: 'DOE'
    }));
    expect(fs.promises.unlink).toHaveBeenCalledWith('test.jpg');
  });
  
  it('should handle empty sheet errors by returning an error result instead of throwing', async () => {
    // Mock the prompt validator to throw an empty sheet error
    const emptySheetError = new ProcessingError(
      'No readable text found on the sheet',
      'empty_sheet',
      'test.jpg'
    );
    mockPrompt.validateAndConvert.mockImplementation(() => {
      throw emptySheetError;
    });
    
    const result = await processFile('test.jpg');
    
    // Should return error info rather than throwing
    expect(result).toEqual({
      fileName: 'test.jpg',
      error: true,
      errorType: 'empty_sheet',
      errorMessage: 'No readable text found on the sheet',
      ai_provider: expect.any(String), // Accept any string for the provider
      model_version: 'mock-model-1.0'
    });
    
    // Should still clean up the file
    expect(fs.promises.unlink).toHaveBeenCalledWith('test.jpg');
  });
  
  it('should still throw non-empty-sheet errors', async () => {
    // Mock the prompt validator to throw a different type of error
    const validationError = new ProcessingError(
      'Invalid name format', 
      'validation',
      'test.jpg'
    );
    mockPrompt.validateAndConvert.mockImplementation(() => {
      throw validationError;
    });
    
    await expect(processFile('test.jpg')).rejects.toThrow('Invalid name format');
    expect(fs.promises.unlink).not.toHaveBeenCalled(); // Should not clean up file on error
  });
}); 