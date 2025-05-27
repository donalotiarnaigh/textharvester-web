/**
 * @jest-environment jsdom
 */
import { ProgressClient } from '../ProgressClient.js';

describe('ProgressClient', () => {
  let progressClient;
  
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = jest.fn();
    progressClient = new ProgressClient();
  });

  describe('getProgress', () => {
    it('should fetch progress from the API', async () => {
      const mockProgress = {
        progress: 45,
        phase: 'ocr',
        errors: []
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProgress),
        headers: new Headers()
      });

      const result = await progressClient.getProgress();
      expect(result).toEqual({
        progress: 45,
        state: 'ocr',
        phase: 'ocr',
        errors: [],
        files: {},
        isComplete: false
      });
      expect(fetch).toHaveBeenCalledWith('/api/progress', expect.any(Object));
    });

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(progressClient.getProgress()).rejects.toThrow('HTTP error! status: 500');
    });

    it('should handle 304 responses', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 304
      });

      const result = await progressClient.getProgress();
      expect(result).toBeNull();
    });
  });

  describe('verifyCompletion', () => {
    it('should verify completion status', async () => {
      const mockCompletion = {
        isComplete: true
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletion)
      });

      const result = await progressClient.verifyCompletion();
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/verify-completion');
    });

    it('should handle verification errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await progressClient.verifyCompletion();
      expect(result).toBe(false);
    });
  });

  describe('getErrors', () => {
    it('should fetch errors from API', async () => {
      const mockErrors = [
        { fileId: '1', message: 'Error 1' },
        { fileId: '2', message: 'Error 2' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockErrors)
      });

      const result = await progressClient.getErrors();
      expect(result).toEqual(mockErrors);
      expect(fetch).toHaveBeenCalledWith('/api/processing-errors');
    });

    it('should handle error fetch failures', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await progressClient.getErrors();
      expect(result).toEqual([]);
    });
  });
}); 