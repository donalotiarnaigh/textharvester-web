const httpMocks = require('node-mocks-http');
const { getProgress, verifyCompletion } = require('../progressController');
const { getProcessingProgress, verifyProcessingCompletion } = require('../../utils/fileQueue');

jest.mock('../../utils/fileQueue');

describe('Progress Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = httpMocks.createRequest();
    mockRes = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('GET /api/progress', () => {
    it('should return current progress state', async () => {
      const mockProgress = {
        totalFiles: 2,
        processedFiles: 0,
        phase: 'upload',
        files: {
          'file1.jpg': { phases: { upload: 50, ocr: 0, analysis: 0, validation: 0 } },
          'file2.jpg': { phases: { upload: 75, ocr: 0, analysis: 0, validation: 0 } }
        }
      };

      getProcessingProgress.mockReturnValue(mockProgress);

      await getProgress(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockProgress);
    });

    it('should handle errors gracefully', async () => {
      getProcessingProgress.mockImplementation(() => {
        throw new Error('Failed to get progress');
      });

      await getProgress(mockReq, mockRes);

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
        validFiles: ['file1.jpg'],
        invalidFiles: [],
        errors: [],
        validationErrors: []
      };

      verifyProcessingCompletion.mockResolvedValue(mockVerificationResult);

      await verifyCompletion(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockVerificationResult);
    });

    it('should handle verification failures', async () => {
      verifyProcessingCompletion.mockRejectedValue(new Error('Failed to verify completion'));

      await verifyCompletion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to verify completion'
      });
    });
  });
}); 