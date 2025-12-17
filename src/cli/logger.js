/**
 * CLI Logger Configuration
 * Placeholder for Task 11.2
 */

const defaultLogger = require('../utils/logger');
const { CLIError } = require('./errors');

function configureLogger(options, logger = defaultLogger) {
    if (options.verbose && options.quiet) {
        throw new CLIError('VALIDATION_ERROR', 'Conflicting options: --quiet and --verbose cannot be used together');
    }

    if (options.verbose) {
        logger.setVerboseMode(true);
    }

    if (options.quiet) {
        logger.setQuietMode(true);
    }

    if (options.debugApi) {
        logger.updateSamplingRates({ payloadLogging: 1.0 });
        logger.setVerboseMode(true); // Ensure verbose is on to see payloads if not implicit
    }
}

module.exports = { configureLogger };
