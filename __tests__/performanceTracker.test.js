/**
 * Tests for PerformanceTracker utility
 */

const PerformanceTracker = require('../src/utils/performanceTracker');

// Mock logger to avoid file system operations in tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  trackMetrics: jest.fn(),
  debugPayload: jest.fn()
}));

describe('PerformanceTracker', () => {
  let tracker;

  beforeEach(() => {
    // Clear singleton instance for each test
    PerformanceTracker.instance = null;
    tracker = PerformanceTracker.getInstance();
    tracker.clearMetrics();
  });

  describe('trackAPICall', () => {
    test('should track successful API calls', async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      
      const result = await PerformanceTracker.trackAPICall(
        'openai',
        'gpt-4o',
        'processImage',
        mockFn,
        { testMetadata: 'value' }
      );

      expect(result).toEqual({ success: true });
      expect(mockFn).toHaveBeenCalledTimes(1);

      const stats = tracker.getStats();
      expect(stats['openai-gpt-4o']).toBeDefined();
      expect(stats['openai-gpt-4o'].totalCalls).toBe(1);
      expect(stats['openai-gpt-4o'].successfulCalls).toBe(1);
      expect(stats['openai-gpt-4o'].failedCalls).toBe(0);
    });

    test('should track failed API calls', async () => {
      const mockError = new Error('API Error');
      const mockFn = jest.fn().mockRejectedValue(mockError);
      
      await expect(
        PerformanceTracker.trackAPICall(
          'anthropic',
          'claude-4-sonnet-20250514',
          'processImage',
          mockFn
        )
      ).rejects.toThrow('API Error');

      const stats = tracker.getStats();
      expect(stats['anthropic-claude-4-sonnet-20250514']).toBeDefined();
      expect(stats['anthropic-claude-4-sonnet-20250514'].totalCalls).toBe(1);
      expect(stats['anthropic-claude-4-sonnet-20250514'].successfulCalls).toBe(0);
      expect(stats['anthropic-claude-4-sonnet-20250514'].failedCalls).toBe(1);
    });

    test('should calculate response times', async () => {
      const mockFn = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ success: true }), 100);
        });
      });
      
      await PerformanceTracker.trackAPICall(
        'openai',
        'gpt-4o',
        'processImage',
        mockFn
      );

      const stats = tracker.getStats();
      expect(stats['openai-gpt-4o'].averageResponseTime).toBeGreaterThan(90);
      expect(stats['openai-gpt-4o'].minResponseTime).toBeGreaterThan(90);
      expect(stats['openai-gpt-4o'].maxResponseTime).toBeGreaterThan(90);
    });
  });

  describe('getStats', () => {
    test('should return empty stats initially', () => {
      const stats = tracker.getStats();
      expect(stats).toEqual({});
    });

    test('should filter stats by provider', async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      
      await PerformanceTracker.trackAPICall('openai', 'gpt-4o', 'processImage', mockFn);
      await PerformanceTracker.trackAPICall('anthropic', 'claude-4-sonnet-20250514', 'processImage', mockFn);

      const openaiStats = tracker.getStats('openai');
      expect(Object.keys(openaiStats)).toHaveLength(1);
      expect(openaiStats['openai-gpt-4o']).toBeDefined();

      const anthropicStats = tracker.getStats('anthropic');
      expect(Object.keys(anthropicStats)).toHaveLength(1);
      expect(anthropicStats['anthropic-claude-4-sonnet-20250514']).toBeDefined();
    });

    test('should calculate success rate', async () => {
      const successFn = jest.fn().mockResolvedValue({ success: true });
      const failFn = jest.fn().mockRejectedValue(new Error('Failed'));
      
      await PerformanceTracker.trackAPICall('openai', 'gpt-4o', 'processImage', successFn);
      await PerformanceTracker.trackAPICall('openai', 'gpt-4o', 'processImage', successFn);
      
      try {
        await PerformanceTracker.trackAPICall('openai', 'gpt-4o', 'processImage', failFn);
      } catch (e) {
        // Expected to fail
      }

      const stats = tracker.getStats();
      expect(stats['openai-gpt-4o'].successRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('generateSummary', () => {
    test('should generate comprehensive summary', async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      
      await PerformanceTracker.trackAPICall('openai', 'gpt-4o', 'processImage', mockFn);
      await PerformanceTracker.trackAPICall('anthropic', 'claude-4-sonnet-20250514', 'processImage', mockFn);

      const summary = tracker.generateSummary();
      
      expect(summary.totalProviders).toBe(2);
      expect(summary.totalModels).toBe(2);
      expect(summary.totalCalls).toBe(2);
      expect(summary.totalSuccessful).toBe(2);
      expect(summary.totalFailed).toBe(0);
      expect(summary.overallSuccessRate).toBe(100);
      
      expect(summary.providerComparison.openai).toBeDefined();
      expect(summary.providerComparison.anthropic).toBeDefined();
      expect(summary.modelComparison['openai-gpt-4o']).toBeDefined();
      expect(summary.modelComparison['anthropic-claude-4-sonnet-20250514']).toBeDefined();
    });
  });

  describe('getRecentMetrics', () => {
    test('should return recent metrics', async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      
      await PerformanceTracker.trackAPICall('openai', 'gpt-4o', 'processImage', mockFn);
      await PerformanceTracker.trackAPICall('anthropic', 'claude-4-sonnet-20250514', 'processImage', mockFn);

      const recentMetrics = tracker.getRecentMetrics(5);
      expect(recentMetrics).toHaveLength(2);
      expect(recentMetrics[0].provider).toBe('openai');
      expect(recentMetrics[1].provider).toBe('anthropic');
    });

    test('should limit recent metrics', async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      
      for (let i = 0; i < 10; i++) {
        await PerformanceTracker.trackAPICall('openai', 'gpt-4o', 'processImage', mockFn);
      }

      const recentMetrics = tracker.getRecentMetrics(5);
      expect(recentMetrics).toHaveLength(5);
    });
  });

  describe('clearMetrics', () => {
    test('should clear all metrics', async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      
      await PerformanceTracker.trackAPICall('openai', 'gpt-4o', 'processImage', mockFn);
      
      let stats = tracker.getStats();
      expect(Object.keys(stats)).toHaveLength(1);
      
      tracker.clearMetrics();
      
      stats = tracker.getStats();
      expect(Object.keys(stats)).toHaveLength(0);
      
      const recentMetrics = tracker.getRecentMetrics();
      expect(recentMetrics).toHaveLength(0);
    });
  });
});
