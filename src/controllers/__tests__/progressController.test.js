const { ProcessingStateManager } = require('../../../public/js/utils/ProcessingStateManager');
const { CompletionVerifier } = require('../../../public/js/modules/processing/CompletionVerifier');
const { progressController } = require('../progressController');

describe('Progress Controller', () => {
  let stateManager;
  let mockStorage;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Mock storage
    mockStorage = {
      getProcessedFile: jest.fn(),
      cleanupTempFiles: jest.fn(),
      validateResults: jest.fn()
    };

    // Setup state manager
    stateManager = new ProcessingStateManager(mockStorage);

    // Mock Express req/res
    mockReq = {
      body: {}
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Initialize controller with state manager
    progressController.init(stateManager);
  });

  describe('GET /api/progress', () => {
    it('should return current progress state', async () => {
      // Setup test state
      stateManager.addFiles(['file1.jpg', 'file2.jpg']);
      stateManager.setPhase('upload');
      await stateManager.updateProgress('file1.jpg', 'upload', 50);
      await stateManager.updateProgress('file2.jpg', 'upload', 75);

      // Call endpoint
      await progressController.getProgress(mockReq, mockRes);

      // Verify response
      expect(mockRes.json).toHaveBeenCalledWith({
        files: {
          'file1.jpg': { phases: { upload: 50, ocr: 0, analysis: 0, validation: 0 } },
          'file2.jpg': { phases: { upload: 75, ocr: 0, analysis: 0, validation: 0 } }
        },
        totalFiles: 2,
        processedFiles: 0,
        phase: 'upload'
      });
    });

    it('should handle errors gracefully', async () => {
      // Force an error
      stateManager.state = null;

      // Call endpoint
      await progressController.getProgress(mockReq, mockRes);

      // Verify error response
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to get progress'
      });
    });
  });

  describe('POST /api/verify-completion', () => {
    it('should verify completion status', async () => {
      // Setup test state
      stateManager.addFiles(['file1.jpg']);
      await stateManager.updateProgress('file1.jpg', 'upload', 100);
      await stateManager.updateProgress('file1.jpg', 'ocr', 100);
      await stateManager.updateProgress('file1.jpg', 'analysis', 100);
      await stateManager.updateProgress('file1.jpg', 'validation', 100);

      mockStorage.getProcessedFile.mockResolvedValue({ exists: true, size: 1024 });
      mockStorage.validateResults.mockResolvedValue({ isValid: true });

      // Call endpoint
      await progressController.verifyCompletion(mockReq, mockRes);

      // Verify response
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        isComplete: true,
        validFiles: ['file1.jpg'],
        invalidFiles: [],
        errors: [],
        validationErrors: []
      }));
    });

    it('should handle verification failures', async () => {
      // Setup test state with invalid file
      stateManager.addFiles(['file1.jpg']);
      mockStorage.getProcessedFile.mockResolvedValue({ exists: true, size: 0 });
      mockStorage.validateResults.mockResolvedValue({ isValid: false, error: 'Invalid result' });

      // Call endpoint
      await progressController.verifyCompletion(mockReq, mockRes);

      // Verify response
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        isComplete: false,
        invalidFiles: ['file1.jpg']
      }));
    });
  });

  describe('POST /api/cleanup', () => {
    it('should cleanup completed files', async () => {
      // Setup test state
      stateManager.addFiles(['file1.jpg']);
      await stateManager.updateProgress('file1.jpg', 'upload', 100);
      await stateManager.updateProgress('file1.jpg', 'ocr', 100);
      await stateManager.updateProgress('file1.jpg', 'analysis', 100);
      await stateManager.updateProgress('file1.jpg', 'validation', 100);

      mockStorage.getProcessedFile.mockResolvedValue({ exists: true, size: 1024 });
      mockStorage.validateResults.mockResolvedValue({ isValid: true });

      // Call endpoint
      await progressController.cleanupProcessing(mockReq, mockRes);

      // Verify response
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        cleanedFiles: ['file1.jpg']
      });
      expect(mockStorage.cleanupTempFiles).toHaveBeenCalledWith('file1.jpg');
    });

    it('should handle cleanup failures', async () => {
      // Setup test state with cleanup error
      stateManager.addFiles(['file1.jpg']);
      mockStorage.cleanupTempFiles.mockRejectedValue(new Error('Cleanup failed'));

      // Call endpoint
      await progressController.cleanupProcessing(mockReq, mockRes);

      // Verify error response
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to cleanup processing'
      });
    });
  });
}); 