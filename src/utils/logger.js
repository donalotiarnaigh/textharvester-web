// In logger.js
const winston = require('winston');
const config = require('../../config.json');

// Configure winston logging
const logger = winston.createLogger({
  level: config.logging.level, // Dynamically set from the config
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`
    ),
    winston.format.errors({ stack: true }) // To log stack traces for errors
  ),
  transports: [
    // Error log file dynamically set from the config
    new winston.transports.File({
      filename: config.logging.errorLogFile,
      level: 'error',
    }),
    // Combined log file dynamically set from the config
    new winston.transports.File({ filename: config.logging.combinedLogFile }),
  ],
});

// Adjust to log to console if in 'development' as per config.environment
if (config.environment === 'development') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

module.exports = logger;
