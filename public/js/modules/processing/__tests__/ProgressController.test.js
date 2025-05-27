/**
 * @jest-environment jsdom
 */

describe('ProgressController', () => {
  let progressController;
  let mockProgressClient;
  let mockProgressBar;
  
  beforeEach(() => {
    jest.useFakeTimers();
    
    // Mock dependencies
    mockProgressClient = {
      getProgress: jest.fn(),
      verifyCompletion: jest.fn()
    };
    
    mockProgressBar = {
      updateProgress: jest.fn(),
      showError: jest.fn(),
      showComplete: jest.fn()
    };
    
    const { ProgressController } = require('../ProgressController');
    progressController = new ProgressController(mockProgressClient, mockProgressBar);
  });
  
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('startPolling', () => {
    it('should start polling progress endpoint', async () => {
      const mockProgress = {
        progress: 45,
        phase: 'ocr',
        errors: []
      };
      
      mockProgressClient.getProgress.mockResolvedValue(mockProgress);
      
      progressController.startPolling();
      
      // Wait for initial poll
      await Promise.resolve();
      await Promise.resolve();
      
      expect(mockProgressClient.getProgress).toHaveBeenCalled();
      expect(mockProgressBar.updateProgress).toHaveBeenCalledWith(45, 'ocr');
    });

    it('should handle progress errors', async () => {
      mockProgressClient.getProgress.mockRejectedValue(new Error('API Error'));
      
      progressController.startPolling();
      
      // Wait for initial poll
      await Promise.resolve();
      await Promise.resolve();
      
      expect(mockProgressBar.showError).toHaveBeenCalled();
    });
  });

  describe('stopPolling', () => {
    it('should stop polling on completion', async () => {
      const mockProgress = {
        progress: 100,
        phase: 'validation',
        errors: []
      };
      
      mockProgressClient.getProgress.mockResolvedValue(mockProgress);
      mockProgressClient.verifyCompletion.mockResolvedValue({ isComplete: true });
      
      progressController.startPolling();
      
      // Wait for initial poll and completion check
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      
      expect(mockProgressBar.showComplete).toHaveBeenCalled();
      
      // Should not poll again
      jest.advanceTimersByTime(2000);
      expect(mockProgressClient.getProgress).toHaveBeenCalledTimes(1);
    });

    it('should stop polling on error', async () => {
      mockProgressClient.getProgress.mockRejectedValue(new Error('API Error'));
      
      progressController.startPolling();
      
      // Wait for initial poll
      await Promise.resolve();
      await Promise.resolve();
      
      expect(mockProgressBar.showError).toHaveBeenCalled();
      
      // Should not poll again
      jest.advanceTimersByTime(2000);
      expect(mockProgressClient.getProgress).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleProgress', () => {
    it('should update UI with progress data', async () => {
      const progressData = {
        progress: 75,
        phase: 'analysis',
        errors: []
      };
      
      await progressController.handleProgress(progressData);
      
      expect(mockProgressBar.updateProgress).toHaveBeenCalledWith(75, 'analysis');
    });

    it('should handle completion', async () => {
      const progressData = {
        progress: 100,
        phase: 'validation',
        errors: []
      };
      
      mockProgressClient.verifyCompletion.mockResolvedValue({ isComplete: true });
      
      await progressController.handleProgress(progressData);
      
      expect(mockProgressBar.showComplete).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const progressData = {
        progress: 50,
        phase: 'ocr',
        errors: ['Error processing file']
      };
      
      await progressController.handleProgress(progressData);
      
      expect(mockProgressBar.showError).toHaveBeenCalled();
    });
  });
}); 