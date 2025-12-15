const { CLIError } = require('../cli/errors');
const { processFile } = require('../utils/fileProcessing');
const glob = require('glob');
const fs = require('fs');
const logger = require('../utils/logger');

class IngestService {
  constructor(config = {}, loggerInstance = null) {
    this.config = config;
    this.logger = loggerInstance || logger;
  }

  /**
       * Ingest files matching the given pattern.
       * @param {string} pattern - Glob pattern or file path
       * @param {Object} options - Processing options
       * @returns {Promise<Object>} IngestResult
       */
  async ingest(pattern, options = {}) {
    // Merge config defaults with runtime options
    const effectiveOptions = { ...this.config, ...options };

    // Validate source type
    const validSourceTypes = ['memorial', 'burial_register', 'grave_record_card'];
    if (effectiveOptions.sourceType && !validSourceTypes.includes(effectiveOptions.sourceType)) {
      throw new CLIError('INVALID_SOURCE_TYPE', `Unknown source type: ${effectiveOptions.sourceType}`);
    }

    const files = await this.expandPattern(pattern);
    if (files.length === 0) {
      throw new CLIError('NO_FILES_MATCHED', `No files matched: ${pattern}`);
    }
    this.logger.info(`Found ${files.length} files matching pattern: ${pattern}`);

    const batchSize = effectiveOptions.batchSize || 1;
    const batches = this.chunk(files, batchSize);

    const successes = [];
    const failures = [];

    // Process batches sequentially
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} files)`);

      const batchPromises = batch.map(file => this.processOne(file, effectiveOptions));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        const file = batch[index];
        if (result.status === 'fulfilled') {
          successes.push(result.value);
        } else {
          const error = result.reason;
          this.logger.error(`Failed to process ${file}`, error);
          failures.push({
            file,
            success: false,
            error: error.message || String(error),
            code: error.code || 'UNKNOWN_ERROR'
          });
        }
      });
    }

    this.logger.info(`Ingestion complete. Success: ${successes.length}, Failed: ${failures.length}`);

    return {
      total: files.length,
      successful: successes.length,
      failed: failures.length,
      partial: failures.length > 0 && successes.length > 0,
      successes,
      failures
    };
  }

  /**
       * Expand glob pattern to file list.
       * @param {string} pattern 
       * @returns {Promise<string[]>}
       */
  async expandPattern(pattern) {
    return new Promise((resolve, reject) => {
      glob(pattern, (err, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });
  }

  /**
       * Process a single file.
       * @param {string} file 
       * @param {Object} options 
       */
  async processOne(file, options) {
    // Check if file is readable
    try {
      await fs.promises.access(file, fs.constants.R_OK);
    } catch (err) { // eslint-disable-line no-unused-vars
      throw new CLIError('FILE_NOT_READABLE', `File not readable: ${file}`);
    }

    // processFile returns the extracted data
    const result = await processFile(file, options);
    // We wrap it in a success structure if needed by the caller,
    // but the design says successes array contains objects.
    // processFile returns the record. Let's append file info if missing.
    return {
      success: true,
      file,
      recordId: result.id || result.memorial_id || null, // Best effort ID extraction
      data: result
    };
  }

  /**
       * Chunk array into batches.
       */
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = IngestService;
