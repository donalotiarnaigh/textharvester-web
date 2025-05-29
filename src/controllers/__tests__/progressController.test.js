const httpMocks = require('node-mocks-http');
const { progressController } = require('../progressController');

describe('Progress Controller', () => {
  let mockReq;
  let mockRes;
  let mockStateManager;

  beforeEach(() => {
    mockReq = httpMocks.createRequest();
    mockRes = httpMocks.createResponse();
    
    // Convert mockRes methods to Jest spies
    mockRes.json = jest.fn();
    mockRes.status = jest.fn(() => mockRes); // status returns this for chaining
    
    // Mock the state manager that progressController uses
    mockStateManager = {
      state: {
        files: new Map(),
        totalFiles: 2,
        processedFiles: 0,
        phase: 'upload',
        completionState: {
          verificationAttempts: 0,
          allFilesProcessed: false,
          resultsVerified: false
        }
      },
      completionVerifier: {
        verifyCompletion: jest.fn(),
        verifyFileCompletion: jest.fn(),
        cleanupTemporaryStates: jest.fn()
      }
    };
    
    // Initialize the progressController with our mock
    progressController.init(mockStateManager);
    
    jest.clearAllMocks();
  });

  describe('GET /api/progress', () => {
    it('should return current progress state', async () => {
      // Set up the mock state
      mockStateManager.state.files.set('file1.jpg', {
        phases: { upload: 50, ocr: 0, analysis: 0, validation: 0 }
      });
      mockStateManager.state.files.set('file2.jpg', {
        phases: { upload: 75, ocr: 0, analysis: 0, validation: 0 }
      });

      await progressController.getProgress(mockReq, mockRes);

      const expectedResponse = {
        totalFiles: 2,
        processedFiles: 0,
        phase: 'upload',
        files: {
          'file1.jpg': { phases: { upload: 50, ocr: 0, analysis: 0, validation: 0 } },
          'file2.jpg': { phases: { upload: 75, ocr: 0, analysis: 0, validation: 0 } }
        }
      };

      expect(mockRes.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle errors gracefully', async () => {
      // Simulate an error by corrupting the state
      mockStateManager.state = null;

      await progressController.getProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to get progress'
      });
    });
  });

  describe('POST /api/verify-completion', () => {
    it('should verify completion status', async () => {
      const mockVerificationResult = {
        isComplete: true,
        state: 'complete',
        validFiles: ['file1.jpg'],
        invalidFiles: [],
        errors: [],
        validationErrors: []
      };

      mockStateManager.completionVerifier.verifyCompletion.mockResolvedValue(mockVerificationResult);

      await progressController.verifyCompletion(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockVerificationResult);
    });

    it('should handle verification failures', async () => {
      mockStateManager.completionVerifier.verifyCompletion.mockRejectedValue(new Error('Failed to verify completion'));

      await progressController.verifyCompletion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to verify completion'
      });
    });
  });
}); 