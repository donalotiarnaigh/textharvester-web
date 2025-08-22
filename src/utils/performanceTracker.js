/**
 * Performance tracking utility for monitoring API calls and system performance
 */

const logger = require('./logger');

class PerformanceTracker {
  constructor() {
    this.metrics = new Map();
    this.recentMetrics = [];
    this.maxRecentMetrics = 100; // Keep last 100 metrics for quick access
  }

  /**
   * Track an API call with timing and memory usage
   * @param {string} provider - The AI provider (openai, anthropic)
   * @param {string} model - The model name (gpt-5, claude-4-sonnet-20250514)
   * @param {string} operation - The operation type (processImage, etc)
   * @param {Function} fn - The async function to execute and track
   * @param {Object} metadata - Additional metadata to track
   * @returns {Promise} The result of the function execution
   */
  static async trackAPICall(provider, model, operation, fn, metadata = {}) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const trackingId = `${provider}-${model}-${Date.now()}`;

    logger.info(`[PERF] Starting ${operation} with ${provider}/${model} (ID: ${trackingId})`);

    try {
      const result = await fn();
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      const responseTime = endTime - startTime;
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      const performanceData = {
        trackingId,
        provider,
        model,
        operation,
        responseTime,
        memoryDelta,
        memoryUsage: {
          start: startMemory,
          end: endMemory
        },
        status: 'success',
        timestamp: new Date().toISOString(),
        metadata
      };

      // Log performance data
      logger.info(`[PERF] ${operation} completed successfully`, {
        provider,
        model,
        responseTime: `${responseTime}ms`,
        memoryDelta: `${Math.round(memoryDelta / 1024 / 1024 * 100) / 100}MB`,
        trackingId
      });

      // Track metrics for analytics
      logger.trackMetrics('api_performance', performanceData);

      // Store in singleton instance for real-time access
      PerformanceTracker.getInstance().addMetric(performanceData);

      return result;
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const performanceData = {
        trackingId,
        provider,
        model,
        operation,
        responseTime,
        status: 'error',
        error: error.message,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString(),
        metadata
      };

      logger.error(`[PERF] ${operation} failed`, {
        provider,
        model,
        responseTime: `${responseTime}ms`,
        error: error.message,
        trackingId
      });

      // Track failed metrics
      logger.trackMetrics('api_performance', performanceData);
      PerformanceTracker.getInstance().addMetric(performanceData);

      throw error;
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  /**
   * Add a metric to the tracking system
   * @param {Object} metric - The performance metric to add
   */
  addMetric(metric) {
    // Add to recent metrics (sliding window)
    this.recentMetrics.push(metric);
    if (this.recentMetrics.length > this.maxRecentMetrics) {
      this.recentMetrics.shift();
    }

    // Update aggregated metrics by provider/model
    const key = `${metric.provider}-${metric.model}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        provider: metric.provider,
        model: metric.model,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        averageResponseTime: 0,
        totalMemoryDelta: 0,
        lastCall: null,
        recentErrors: []
      });
    }

    const stats = this.metrics.get(key);
    stats.totalCalls++;
    stats.lastCall = metric.timestamp;

    if (metric.status === 'success') {
      stats.successfulCalls++;
      stats.totalResponseTime += metric.responseTime;
      stats.minResponseTime = Math.min(stats.minResponseTime, metric.responseTime);
      stats.maxResponseTime = Math.max(stats.maxResponseTime, metric.responseTime);
      stats.averageResponseTime = stats.totalResponseTime / stats.successfulCalls;
      
      if (metric.memoryDelta) {
        stats.totalMemoryDelta += metric.memoryDelta;
      }
    } else {
      stats.failedCalls++;
      stats.recentErrors.push({
        error: metric.error,
        timestamp: metric.timestamp,
        responseTime: metric.responseTime
      });
      
      // Keep only last 10 errors
      if (stats.recentErrors.length > 10) {
        stats.recentErrors.shift();
      }
    }
  }

  /**
   * Get current performance statistics
   * @param {string} provider - Optional provider filter
   * @param {string} model - Optional model filter
   * @returns {Object} Performance statistics
   */
  getStats(provider = null, model = null) {
    const stats = {};
    
    for (const [key, data] of this.metrics.entries()) {
      if (provider && data.provider !== provider) continue;
      if (model && data.model !== model) continue;
      
      stats[key] = {
        ...data,
        successRate: data.totalCalls > 0 ? (data.successfulCalls / data.totalCalls) * 100 : 0,
        averageMemoryDelta: data.successfulCalls > 0 ? data.totalMemoryDelta / data.successfulCalls : 0
      };
    }

    return stats;
  }

  /**
   * Get recent metrics (last N calls)
   * @param {number} limit - Number of recent metrics to return
   * @returns {Array} Recent metrics
   */
  getRecentMetrics(limit = 20) {
    return this.recentMetrics.slice(-limit);
  }

  /**
   * Generate a performance summary report
   * @returns {Object} Performance summary
   */
  generateSummary() {
    const stats = this.getStats();
    const summary = {
      totalProviders: new Set(Object.values(stats).map(s => s.provider)).size,
      totalModels: Object.keys(stats).length,
      totalCalls: Object.values(stats).reduce((sum, s) => sum + s.totalCalls, 0),
      totalSuccessful: Object.values(stats).reduce((sum, s) => sum + s.successfulCalls, 0),
      totalFailed: Object.values(stats).reduce((sum, s) => sum + s.failedCalls, 0),
      overallSuccessRate: 0,
      providerComparison: {},
      modelComparison: {}
    };

    if (summary.totalCalls > 0) {
      summary.overallSuccessRate = (summary.totalSuccessful / summary.totalCalls) * 100;
    }

    // Provider comparison
    const providers = {};
    for (const stat of Object.values(stats)) {
      if (!providers[stat.provider]) {
        providers[stat.provider] = {
          totalCalls: 0,
          successfulCalls: 0,
          totalResponseTime: 0,
          models: []
        };
      }
      providers[stat.provider].totalCalls += stat.totalCalls;
      providers[stat.provider].successfulCalls += stat.successfulCalls;
      providers[stat.provider].totalResponseTime += stat.totalResponseTime;
      providers[stat.provider].models.push({
        model: stat.model,
        averageResponseTime: stat.averageResponseTime,
        successRate: stat.successRate
      });
    }

    for (const [provider, data] of Object.entries(providers)) {
      summary.providerComparison[provider] = {
        averageResponseTime: data.successfulCalls > 0 ? data.totalResponseTime / data.successfulCalls : 0,
        successRate: data.totalCalls > 0 ? (data.successfulCalls / data.totalCalls) * 100 : 0,
        totalCalls: data.totalCalls,
        models: data.models
      };
    }

    // Model comparison
    summary.modelComparison = Object.fromEntries(
      Object.entries(stats).map(([key, stat]) => [
        key,
        {
          provider: stat.provider,
          model: stat.model,
          averageResponseTime: stat.averageResponseTime,
          successRate: stat.successRate,
          totalCalls: stat.totalCalls,
          minResponseTime: stat.minResponseTime === Infinity ? 0 : stat.minResponseTime,
          maxResponseTime: stat.maxResponseTime
        }
      ])
    );

    return summary;
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics() {
    this.metrics.clear();
    this.recentMetrics = [];
  }
}

module.exports = PerformanceTracker;
