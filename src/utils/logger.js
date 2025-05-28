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
   * @param {Object} metrics Processing metrics
   */
  trackMetrics(metrics) {
    if (metrics.processingTime) {
      this.metrics.processingTimes.push(metrics.processingTime);
    }
    if (metrics.success) {
      this.metrics.successCount++;
    } else {
      this.metrics.failureCount++;
    }
    this.metrics.totalFiles++;
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
