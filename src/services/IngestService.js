const { CLIError } = require('../cli/errors');
const { processFile } = require('../utils/fileProcessing');
const glob = require('glob');
const fs = require('fs');

class IngestService {
  constructor(config = {}) {
    this.config = config;
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

    const files = await this.expandPattern(pattern);
    if (files.length === 0) {
      throw new CLIError('NO_FILES_MATCHED', `No files matched: ${pattern}`);
    }

    const batchSize = effectiveOptions.batchSize || 1;
    const batches = this.chunk(files, batchSize);

    // Validate source type early if possible, though processFile handles it too.
    // We defer strictvalidation to processFile to avoid duplicating logic, 
    // but the design doc mentions validating source type in CLI layer.
    // For now we rely on processFile or the CLI command wrapper for validation.

    const successes = [];
    const failures = [];

    // Process batches sequentially
    for (const batch of batches) {
      const batchPromises = batch.map(file => this.processOne(file, effectiveOptions));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        const file = batch[index];
        if (result.status === 'fulfilled') {
          // processFile returns the data object on success
          successes.push(result.value);
        } else {
          // Check for error properties or extract message
          const error = result.reason;
          failures.push({
            file,
            success: false,
            error: error.message || String(error),
            code: error.code || 'UNKNOWN_ERROR'
          });
        }
      });
    }

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
