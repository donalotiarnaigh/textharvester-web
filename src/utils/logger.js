/**
 * Enhanced logger module with structured error tracking and metrics
 */

const fs = require('fs');
const path = require('path');

// Default config if none provided
const defaultConfig = {
  logging: {
    errorLogFile: path.join(process.cwd(), 'logs', 'error.log'),
    combinedLogFile: path.join(process.cwd(), 'logs', 'combined.log')
  }
};

// Try to load config, fall back to defaults if not found
let config;
try {
  config = require('../../config.json');
} catch (err) {
  config = defaultConfig;
}

class Logger {
  constructor() {
    this.errorPatterns = new Map();
    this.metrics = {
      processingTimes: [],
      successCount: 0,
      failureCount: 0,
      totalFiles: 0
    };
    
    // Ensure log directory exists if we're not in test environment
    if (process.env.NODE_ENV !== 'test') {
      const logDir = path.dirname(config.logging?.errorLogFile || defaultConfig.logging.errorLogFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  info(message, ...args) {
    console.log(`[INFO] ${message}`, ...args);
    this._writeToLog('info', message, args);
  }
  
  error(message, error, context = {}) {
    console.error(`[ERROR] ${message}`, error);
    this._writeToLog('error', message, [error, context]);
    this._trackErrorPattern(error, context);
  }
  
  warn(message, ...args) {
    console.warn(`[WARN] ${message}`, ...args);
    this._writeToLog('warn', message, args);
  }
  
  debug(message, ...args) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args);
      this._writeToLog('debug', message, args);
    }
  }

  /**
   * Track processing metrics
   * @param {string|Object} type - Metric type or legacy metrics object
   * @param {Object} data - Metric data (when type is string)
   */
  trackMetrics(type, data = null) {
    // Handle legacy format for backward compatibility
    if (typeof type === 'object' && data === null) {
      const metrics = type;
      if (metrics.processingTime) {
        this.metrics.processingTimes.push(metrics.processingTime);
      }
      if (metrics.success) {
        this.metrics.successCount++;
      } else {
        this.metrics.failureCount++;
      }
      this.metrics.totalFiles++;
      return;
    }

    // Handle new structured format
    if (typeof type === 'string' && data) {
      // Initialize metrics storage for this type if it doesn't exist
      if (!this.metrics[type]) {
        this.metrics[type] = [];
      }

      // Add timestamp to data
      const metricEntry = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };

      this.metrics[type].push(metricEntry);

      // Keep only last 1000 entries per type to prevent memory issues
      if (this.metrics[type].length > 1000) {
        this.metrics[type] = this.metrics[type].slice(-1000);
      }

      // Log performance metrics with structured format
      if (type === 'api_performance') {
        this.info(`[METRICS] API Performance: ${data.provider}/${data.model} - ${data.responseTime}ms - ${data.status}`);
      }
    }
  }

  /**
   * Get current error patterns and metrics
   * @returns {Object} Error patterns and metrics
   */
  getAnalytics() {
    const avgProcessingTime = this.metrics.processingTimes.length > 0
      ? this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length
      : 0;

    return {
      errorPatterns: Array.from(this.errorPatterns.entries()).map(([pattern, count]) => ({
        pattern,
        count
      })),
      metrics: {
        ...this.metrics,
        averageProcessingTime: avgProcessingTime,
        successRate: this.metrics.totalFiles > 0
          ? (this.metrics.successCount / this.metrics.totalFiles) * 100
          : 0
      }
    };
  }

  /**
   * Write log entry to file
   * @private
   */
  _writeToLog(level, message, args) {
    // Skip file logging in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      args
    };

    const logFile = level === 'error'
      ? (config.logging?.errorLogFile || defaultConfig.logging.errorLogFile)
      : (config.logging?.combinedLogFile || defaultConfig.logging.combinedLogFile);

    fs.appendFile(
      logFile,
      JSON.stringify(logEntry) + '\n',
      err => {
        if (err) console.error('Failed to write to log file:', err);
      }
    );
  }

  /**
   * Track error patterns for analysis
   * @private
   */
  _trackErrorPattern(error, context) {
    const pattern = this._getErrorPattern(error, context);
    const count = (this.errorPatterns.get(pattern) || 0) + 1;
    this.errorPatterns.set(pattern, count);
  }

  /**
   * Get normalized error pattern for grouping similar errors
   * @private
   */
  _getErrorPattern(error, context) {
    const errorType = error && (error.name || error.constructor.name || (typeof error === 'string' ? 'StringError' : 'UnknownError'));
    const phase = context?.phase || 'unknown';
    const operation = context?.operation || 'unknown';
    return `${errorType}:${phase}:${operation}`;
  }
}

// Export singleton instance
module.exports = new Logger();
