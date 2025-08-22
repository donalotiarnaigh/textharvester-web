const fs = require('fs');
const path = require('path');
const { 
  enqueueFiles, 
  getProcessingProgress,
  getProcessedResults 
} = require('../fileQueue');
const { processFile } = require('../fileProcessing');
const { ProcessingError } = require('../errorTypes');

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlink: jest.fn((path, callback) => callback(null))
}));

jest.mock('../logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../fileProcessing', () => ({
  processFile: jest.fn()
}));

jest.mock('../../config.json', () => ({
  uploadPath: 'uploads',
  processingCompleteFlagPath: 'processing-complete.flag',
  maxRetryCount: 3,
  upload: {
    retryDelaySeconds: 0.01
  }
}), { virtual: true });

describe('Enhanced File Queue with Error Handling', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock implementation
    processFile.mockImplementation(async (filePath) => {
      return {
        memorial_number: 'HG-123',
        first_name: 'JOHN',
        last_name: 'DOE',
        fileName: path.basename(filePath)
      };
    });
  });
  
  it('should process files in queue successfully', async () => {
    const files = [
      { path: 'uploads/file1.jpg', originalname: 'file1.jpg' },
      { path: 'uploads/file2.jpg', originalname: 'file2.jpg' }
    ];
    
    enqueueFiles(files);
    
    // Allow queue processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(processFile).toHaveBeenCalledTimes(2);
    expect(processFile).toHaveBeenCalledWith('uploads/file1.jpg', expect.any(Object));
    expect(processFile).toHaveBeenCalledWith('uploads/file2.jpg', expect.any(Object));
    
    const progress = getProcessingProgress();
    expect(progress.state).toBe('complete');
    expect(progress.progress).toBe(100);
  });
  
  it('should continue processing when empty sheet errors occur', async () => {
    // First file processes normally, second file has empty sheet error
    processFile
      .mockResolvedValueOnce({
        memorial_number: 'HG-123',
        first_name: 'JOHN',
        last_name: 'DOE',
        fileName: 'file1.jpg'
      })
      .mockResolvedValueOnce({
        fileName: 'file2.jpg',
        error: true,
        errorType: 'empty_sheet',
        errorMessage: 'No readable text found on the sheet'
      });
    
    const files = [
      { path: 'uploads/file1.jpg', originalname: 'file1.jpg' },
      { path: 'uploads/file2.jpg', originalname: 'file2.jpg' }
    ];
    
    enqueueFiles(files);
    
    // Allow queue processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(processFile).toHaveBeenCalledTimes(2);
    
    // Should complete with 100% progress even with error
    const progress = getProcessingProgress();
    expect(progress.state).toBe('complete');
    expect(progress.progress).toBe(100);
    
    // Should have both successful and error results
    const results = getProcessedResults();
    expect(results.length).toBe(2);
    expect(results[0].error).toBeUndefined();
    expect(results[1].error).toBe(true);
    expect(results[1].errorType).toBe('empty_sheet');
  });
  
  it('should retry files with non-empty-sheet errors', async () => {
    // Mock processFile to fail with validation error on first attempt
    // and succeed on second attempt
    const validationError = new ProcessingError('Invalid name format', 'validation');
    let attempts = 0;
    
    processFile.mockImplementation(async (filePath) => {
      if (filePath === 'uploads/file2.jpg' && attempts === 0) {
        attempts++;
        throw validationError;
      }
      return {
        memorial_number: 'HG-123',
        first_name: 'JOHN',
        last_name: 'DOE',
        fileName: path.basename(filePath)
      };
    });
    
    const files = [
      { path: 'uploads/file1.jpg', originalname: 'file1.jpg' },
      { path: 'uploads/file2.jpg', originalname: 'file2.jpg' }
    ];
    
    enqueueFiles(files);
    
    // Allow queue processing to complete with retry delay
    await new Promise(resolve => setTimeout(resolve, 1000)); // Increased timeout further
    
    // Verify file1 was processed
    expect(processFile).toHaveBeenCalledWith('uploads/file1.jpg', expect.any(Object));
    // Verify file2 was processed
    expect(processFile).toHaveBeenCalledWith('uploads/file2.jpg', expect.any(Object));
  });
}); 