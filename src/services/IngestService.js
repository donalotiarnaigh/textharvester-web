const { CLIError } = require('../cli/errors');
const { processFile } = require('../utils/fileProcessing');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { enqueueFiles } = require('../utils/fileQueue');
const { clearProcessingCompleteFlag } = require('../utils/processingFlag');
const { convertPdfToJpegs } = require('../utils/pdfConverter');
const { clearAllMemorials } = require('../utils/database');
const { clearAllBurialRegisterEntries } = require('../utils/burialRegisterStorage');
const graveCardStorage = require('../utils/graveCardStorage');
const { getPrompt } = require('../utils/prompts/templates/providerTemplates');
const { promptManager } = require('../utils/prompts/templates/providerTemplates');

class IngestService {
  constructor(config = {}, loggerInstance = null) {
    this.config = config;
    this.logger = loggerInstance || logger;
  }

  /**
   * Validate prompt configuration.
   * @param {string} provider 
   * @param {string} template 
   * @param {string} version 
   * @returns {Promise<Object>} Validated configuration
   */
  async validatePromptConfig(provider, template, version) {
    const defaultTemplate = 'memorialOCR';
    const defaultVersion = 'latest';

    const templateName = template || defaultTemplate;
    const templateVersion = version || defaultVersion;

    const promptTemplate = await getPrompt(provider, templateName, templateVersion);
    if (!promptTemplate) {
      throw new Error(`Invalid template: ${templateName}`);
    }

    // Use the provider prompt manager to validate the template
    const validation = promptManager.validatePrompt(promptTemplate, provider);
    if (!validation.isValid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }

    return {
      template: templateName,
      version: templateVersion,
      config: promptTemplate
    };
  }

  /**
   * Clear existing data for a specific source type.
   * @param {string} sourceType 
   */
  async clearData(sourceType) {
    if (sourceType === 'burial_register') {
      await clearAllBurialRegisterEntries();
      this.logger.info('Cleared existing burial register entries as requested');
    } else if (sourceType === 'grave_record_card') {
      await graveCardStorage.clearAllGraveCards();
      this.logger.info('Cleared existing grave cards as requested');
    } else {
      await clearAllMemorials();
      this.logger.info('Cleared existing memorial records as requested');
    }
  }

  /**
   * Prepare files (handle PDFs) and queue them for processing.
   * @param {Array} files - Array of file objects from multer
   * @param {Object} options - Processing options (provider, promptVersion, etc.)
   */
  async prepareAndQueue(files, options) {
    const {
      sourceType,
      volumeId,
      provider,
      promptVersion
    } = options;

    const filesToQueue = [];

    for (const file of files) {
      try {
        if (file.mimetype === 'application/pdf') {
          // For grave cards, we process the whole PDF (2 pages) at once via GraveCardProcessor
          // So we do NOT want to split it into generic JPEGs here.
          if (sourceType === 'grave_record_card') {
            this.logger.info(`Enqueuing Grave Card PDF for processing: ${file.originalname}`);
            filesToQueue.push({
              path: file.path,
              mimetype: 'application/pdf',
              provider: provider,
              promptVersion: promptVersion,
              source_type: sourceType,
              sourceType,
              uploadDir: path.dirname(file.path)
            });
          } else {
            // For other types (e.g. legacy/standard PDF upload), split into images
            this.logger.info(`Processing PDF file: ${file.originalname}`);
            const imagePaths = await convertPdfToJpegs(file.path);
            this.logger.info(`Converted PDF to images: ${imagePaths}`);
            filesToQueue.push(
              ...imagePaths.map((imagePath) => ({
                path: imagePath,
                mimetype: 'image/jpeg',
                provider: provider,
                promptVersion: promptVersion,
                source_type: sourceType,
                sourceType,
                ...(sourceType === 'burial_register' && { volume_id: volumeId, volumeId }),
                uploadDir: path.dirname(imagePath)
              }))
            );
          }
        } else {
          filesToQueue.push({
            ...file,
            provider: provider,
            promptVersion: promptVersion,
            source_type: sourceType,
            sourceType,
            ...(sourceType === 'burial_register' && { volume_id: volumeId, volumeId }),
            uploadDir: path.dirname(file.path)
          });
        }
      } catch (conversionError) {
        this.logger.error(
          `Error converting file ${file.originalname}:`,
          conversionError
        );
        throw conversionError;
      }
    }

    // Enqueue all files in a single call to maintain sequential processing order
    enqueueFiles(filesToQueue);

    if (sourceType === 'burial_register') {
      this.logger.info(`Enqueued ${filesToQueue.length} burial register files for processing (volume_id=${volumeId}, provider=${provider})`);
    }

    clearProcessingCompleteFlag();

    return filesToQueue.length;
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
