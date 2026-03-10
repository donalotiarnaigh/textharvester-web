const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger'); // Assuming logger is modularized or its path adjusted
const { createProvider } = require('./modelProviders');
const { storeMemorial } = require('./database');
const { getPrompt } = require('./prompts/templates/providerTemplates');
const { isEmptySheetError } = require('./errorTypes');
const burialRegisterFlattener = require('./burialRegisterFlattener');
const burialRegisterStorage = require('./burialRegisterStorage');
const { extractPageNumberFromFilename } = require('./burialRegisterStorage');
const { getMemorialNumberForMonument } = require('./filenameParser');
const { optimizeImageForProvider, analyzeImageForProvider } = require('./imageProcessor');
const graveCardProcessor = require('./imageProcessing/graveCardProcessor');
const graveCardStorage = require('./graveCardStorage');
const monumentClassificationStorage = require('./monumentClassificationStorage');
const config = require('../../config.json');

const VALIDATION_RETRY_PREAMBLE =
  'IMPORTANT: Your previous response could not be parsed. ' +
  'Return ONLY valid JSON matching the exact schema specified. ' +
  'Do not include any explanatory text, markdown code fences, or comments outside the JSON object.';

/**
 * Attempt processImage + validation, retrying once on validation failure.
 * On retry, prepends a format-enforcement preamble to the user prompt.
 * Empty-sheet errors are never retried.
 *
 * @param {Object} provider - AI provider instance
 * @param {string} base64Image - base64-encoded image data
 * @param {string} userPrompt - the user prompt text
 * @param {Object} providerOptions - options passed to provider.processImage
 * @param {Function} validateFn - function(rawContent) => { data, confidenceScores, validationWarnings } (throws on failure)
 * @param {Object} [retryOptions]
 * @param {number} [retryOptions.maxRetries=1] - max validation retries
 * @param {Object} [retryOptions.log] - optional scoped logger (defaults to module logger)
 * @returns {Promise<{ validationResult: Object, usage: Object }>}
 */
async function processWithValidationRetry(provider, base64Image, userPrompt, providerOptions, validateFn, retryOptions = {}) {
  const maxRetries = retryOptions.maxRetries ?? config.retry?.validationRetries ?? 1;
  const log = retryOptions.log || logger;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const effectivePrompt = attempt === 0
      ? userPrompt
      : `${VALIDATION_RETRY_PREAMBLE}\n\n${userPrompt}`;

    const { content: rawData, usage } = await provider.processImage(
      base64Image,
      effectivePrompt,
      providerOptions
    );

    try {
      const validationResult = validateFn(rawData);
      return { validationResult, usage };
    } catch (validationError) {
      lastError = validationError;

      // Never retry empty-sheet errors
      if (isEmptySheetError(validationError)) {
        throw validationError;
      }

      if (attempt < maxRetries) {
        log.warn(
          `Validation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying with format-enforcement preamble: ${validationError.message}`
        );
      }
    }
  }

  throw lastError;
}

/**
 * Calculate estimated cost in USD for a single API call.
 * @param {{ input_tokens: number, output_tokens: number }} usage
 * @param {{ inputPerMToken?: number, outputPerMToken?: number }} costConfig
 * @returns {number}
 */
function calculateCost(usage, costConfig) {
  return (
    ((usage.input_tokens  / 1_000_000) * (costConfig.inputPerMToken  || 0)) +
    ((usage.output_tokens / 1_000_000) * (costConfig.outputPerMToken || 0))
  );
}

/**
 * Create a scoped logger that prefixes all messages with a processing ID.
 * @param {string} processingId UUID for this processing session
 * @returns {Object} Logger-like object with info, warn, error, debug, debugPayload methods
 */
function scopedLogger(processingId) {
  const tag = `[pid:${processingId.substring(0, 8)}]`;
  return {
    info: (msg, ...args) => logger.info(`${tag} ${msg}`, ...args),
    warn: (msg, ...args) => logger.warn(`${tag} ${msg}`, ...args),
    error: (msg, ...args) => logger.error(`${tag} ${msg}`, ...args),
    debug: (msg, ...args) => logger.debug(`${tag} ${msg}`, ...args),
    debugPayload: (msg, ...args) => logger.debugPayload(`${tag} ${msg}`, ...args),
  };
}

/**
 * Enhances the processFile function with detailed logging for better tracking and debugging.
 * Processes a given file by reading and sending its contents to the configured AI provider for OCR processing.
 * @param {string} filePath The path to the file to be processed.
 * @param {Object} options Optional configuration options including provider selection
 * @returns {Promise} A promise that resolves with the API response or rejects with an error.
 */
async function processFile(filePath, options = {}) {
  const providerName = options.provider || process.env.AI_PROVIDER || 'openai';
  const sourceType = options.sourceType || options.source_type || 'record_sheet';

  // Generate processing ID for this file
  const processingId = crypto.randomUUID();
  const log = scopedLogger(processingId);

  // Select template based on source_type (unless custom template is provided)
  const promptTemplate = options.promptTemplate ||
    (sourceType === 'burial_register'
      ? 'burialRegister'
      : sourceType === 'monument_photo'
        ? 'monumentPhotoOCR'
        : sourceType === 'grave_record_card'
          ? 'graveCard'
          : sourceType === 'monument_classification'
            ? 'monumentClassification'
            : sourceType === 'typographic_analysis'
              ? 'typographicAnalysis'
              : 'memorialOCR');

  const promptVersion = options.promptVersion || 'latest';

  // Dynamic Routing for User-Extensible Schema
  if (options.schemaId) {
    log.info(`Processing ${path.basename(filePath)} using dynamic schema: ${options.schemaId}`);
    const DynamicProcessor = require('./dynamicProcessing');
    const processor = new DynamicProcessor(logger);

    try {
      // DynamicProcessor expects { path, provider } and schemaId
      const result = await processor.processFileWithSchema(
        { path: filePath, provider: providerName },
        options.schemaId
      );
      result.processing_id = processingId;
      return result.data; // Return the extracted data
    } catch (error) {
      log.error(`Dynamic processing failed for ${filePath}:`, error);
      throw error;
    }
  }

  log.info(`Processing ${path.basename(filePath)} with provider: ${providerName}, source: ${sourceType}, template: ${promptTemplate}`);

  try {
    // For burial register, skip image optimization (handled differently)
    // For other types, analyze image to see if optimization is needed
    let base64Image;
    if (sourceType === 'burial_register') {
      base64Image = await fs.readFile(filePath, { encoding: 'base64' });
      log.info(`File ${filePath} read successfully (burial register, no optimization). Proceeding with OCR processing.`);
    } else if (sourceType === 'grave_record_card') {
      log.info(`File ${filePath} identified as grave record card. Skipping initial image optimization.`);
      // Grave card processing handles its own file reading and conversion
    } else {
      // Analyze image to see if optimization is needed
      const analysis = await analyzeImageForProvider(filePath, providerName);
      if (analysis.needsOptimization) {
        log.info(`[ImageProcessor] Image requires optimization: ${analysis.reasons.join(', ')}`);
        base64Image = await optimizeImageForProvider(filePath, providerName);
        log.info(`File ${filePath} optimized and processed successfully. Proceeding with OCR processing.`);
      } else {
        // Image is already within limits, read directly
        base64Image = await fs.readFile(filePath, { encoding: 'base64' });
        log.info(`File ${filePath} read successfully (no optimization needed). Proceeding with OCR processing.`);
      }
    }

    // Create provider instance
    const provider = createProvider({
      ...options,
      AI_PROVIDER: providerName
    });

    // Handle grave_record_card processing
    if (sourceType === 'grave_record_card') {
      const startTime = Date.now();
      log.info(`Processing grave record card via ${providerName}: ${filePath}`);

      // Step 1: Process PDF through GraveCardProcessor
      const stitchedBuffer = await graveCardProcessor.processPdf(filePath);
      const base64Image = stitchedBuffer.toString('base64');

      log.info(`Grave card PDF processed and stitched successfully for ${filePath}`);

      // Step 2: Get prompt instance
      const promptInstance = getPrompt(providerName, 'graveCard', promptVersion);
      const promptConfig = promptInstance.getProviderPrompt(providerName);

      const userPrompt = typeof promptConfig === 'string' ? promptConfig : promptConfig.userPrompt;
      const systemPrompt = typeof promptConfig === 'object' ? promptConfig.systemPrompt : undefined;

      // Step 3: Process through AI provider + validate (with retry)
      const { validationResult, usage: graveCardUsage } = await processWithValidationRetry(
        provider,
        base64Image,
        userPrompt,
        { systemPrompt, promptTemplate: promptInstance, log, processingId },
        (raw) => promptInstance.validateAndConvert(raw)
      );

      const apiDuration = Date.now() - startTime;
      log.info(`Grave card API call completed in ${apiDuration}ms for ${filePath}`);

      const validatedData = validationResult.data;
      const graveCardConfidenceScores = validationResult.confidenceScores;
      const graveCardValidationWarnings = validationResult.validationWarnings;

      // Extract confidence metadata
      if (graveCardConfidenceScores && config.confidence?.enabled !== false) {
        validatedData.confidence_scores = graveCardConfidenceScores;
        const threshold = config.confidence?.reviewThreshold ?? 0.70;
        const allScores = Object.values(graveCardConfidenceScores);
        const numericCount = allScores.filter(s => typeof s === 'number').length;
        validatedData.confidence_coverage = allScores.length > 0 ? numericCount / allScores.length : null;
        validatedData.needs_review = allScores.some(s => typeof s === 'number' && s < threshold) ? 1 : 0;
      }

      // Extract validation warnings
      if (graveCardValidationWarnings && graveCardValidationWarnings.length > 0) {
        validatedData.validation_warnings = graveCardValidationWarnings;
        validatedData.needs_review = 1; // force flag even if confidence disabled
      }

      log.info(`${providerName} grave card response validated successfully for ${filePath}`);

      // Step 5: Add metadata
      const filename = path.basename(filePath);
      validatedData.fileName = filename;
      validatedData.ai_provider = providerName;
      validatedData.model_version = provider.getModelVersion();
      validatedData.prompt_template = 'graveCard';
      validatedData.prompt_version = promptInstance.version;
      validatedData.source_type = sourceType;

      // Inject cost data
      {
        const modelVersion = provider.getModelVersion();
        const costConfig = config.costs?.[providerName]?.[modelVersion] || {};
        validatedData.input_tokens       = graveCardUsage.input_tokens;
        validatedData.output_tokens      = graveCardUsage.output_tokens;
        validatedData.estimated_cost_usd = calculateCost(graveCardUsage, costConfig);
      }

      // Attach processing ID
      validatedData.processing_id = processingId;

      // Step 6: Store in database
      await graveCardStorage.storeGraveCard(validatedData);

      log.info(`Grave card data for ${filePath} stored in database with model: ${providerName}`);

      // Note: GraveCardProcessor already cleaned up intermediate files and the PDF

      return validatedData;
    }

    if (sourceType === 'burial_register') {
      const startTime = Date.now();
      log.info(`Processing burial register file via ${providerName}: ${filePath}`);

      const promptInstance = getPrompt(providerName, 'burialRegister', promptVersion);
      const promptConfig = promptInstance.getProviderPrompt(providerName);

      const userPrompt = typeof promptConfig === 'string' ? promptConfig : promptConfig.userPrompt;
      const systemPrompt = typeof promptConfig === 'object' ? promptConfig.systemPrompt : undefined;

      // Use longer timeout for burial register processing (configurable, default 90 seconds)
      const burialRegisterTimeout = config.burialRegister?.apiTimeout || 90000;
      log.debug(`Using API timeout of ${burialRegisterTimeout}ms for burial register processing`);

      const volumeId = options.volume_id || options.volumeId || config.burialRegister?.volumeId || 'vol1';

      const { validationResult, usage: burialUsage } = await processWithValidationRetry(
        provider,
        base64Image,
        userPrompt,
        { systemPrompt, promptTemplate: promptInstance, timeout: burialRegisterTimeout, log, processingId },
        (raw) => {
          if (raw && typeof raw === 'object') {
            raw.volume_id = volumeId;
          }
          return promptInstance.validateAndConvertPage(raw);
        }
      );

      const pageData = validationResult.data;

      const apiDuration = Date.now() - startTime;
      log.info(`Burial register API call completed in ${apiDuration}ms for ${filePath}`);

      log.debugPayload(`Validated burial register page data for ${filePath}:`, pageData);

      // Extract page number from filename for entry_id generation
      const filename = path.basename(filePath);
      const filenamePageNumber = extractPageNumberFromFilename(filename);

      if (filenamePageNumber !== null) {
        log.info(`Extracted page number ${filenamePageNumber} from filename ${filename} for entry_id generation`);
      } else {
        log.warn(`Could not extract page number from filename ${filename}, will use AI-extracted page_number for entry_id`);
      }

      // Pass filename page number for entry_id generation only (pageData.page_number remains AI-extracted)
      const entries = burialRegisterFlattener.flattenPageToEntries(pageData, {
        provider: providerName,
        model: provider.getModelVersion(),
        filePath
      }, filenamePageNumber);

      await burialRegisterStorage.storePageJSON(
        pageData,
        providerName,
        pageData.volume_id,
        pageData.page_number
      );

      log.info(`Prepared ${entries.length} burial register entries for ${filePath}`);

      const processedEntries = [];
      let validCount = 0;
      let totalCount = entries.length;
      let duplicateCount = 0;

      for (const entry of entries) {
        try {
          const validationResult = promptInstance.validateAndConvertEntry(entry);
          const validatedEntry = validationResult.data;
          const entryConfidenceScores = validationResult.confidenceScores;
          const entryValidationWarnings = validationResult.validationWarnings;

          const burialCostConfig = config.costs?.[providerName]?.[provider.getModelVersion()] || {};
          const entryWithMetadata = {
            ...validatedEntry,
            volume_id: entry.volume_id,
            page_number: entry.page_number,
            parish_header_raw: entry.parish_header_raw ?? null,
            county_header_raw: entry.county_header_raw ?? null,
            year_header_raw: entry.year_header_raw ?? null,
            fileName: filename,
            ai_provider: providerName,
            model_name: provider.getModelVersion(),
            model_run_id: entry.model_run_id ?? null,
            prompt_template: 'burialRegister',
            prompt_version: promptInstance.version,
            source_type: 'burial_register',
            input_tokens:       burialUsage.input_tokens,
            output_tokens:      burialUsage.output_tokens,
            estimated_cost_usd: calculateCost(burialUsage, burialCostConfig),
            processing_id: processingId
          };

          if (entryConfidenceScores && config.confidence?.enabled !== false) {
            entryWithMetadata.confidence_scores = entryConfidenceScores;
            const threshold = config.confidence?.reviewThreshold ?? 0.70;
            const allScores = Object.values(entryConfidenceScores);
            const numericCount = allScores.filter(s => typeof s === 'number').length;
            entryWithMetadata.confidence_coverage = allScores.length > 0 ? numericCount / allScores.length : null;
            entryWithMetadata.needs_review = allScores.some(s => typeof s === 'number' && s < threshold) ? 1 : 0;
          }

          if (entryValidationWarnings && entryValidationWarnings.length > 0) {
            entryWithMetadata.validation_warnings = entryValidationWarnings;
            entryWithMetadata.needs_review = 1; // force flag even if confidence disabled
          }

          await burialRegisterStorage.storeBurialRegisterEntry(entryWithMetadata);

          processedEntries.push(entryWithMetadata);
          validCount++;
        } catch (error) {
          // Check if this is a duplicate entry
          if (error.isDuplicate) {
            duplicateCount++;
            log.warn(`Duplicate entry skipped: ${error.message}`);
          } else {
            log.warn(`Entry validation or storage failed for entry_id=${entry.entry_id || 'unknown'}, page_number=${pageData.page_number}, volume_id=${pageData.volume_id}: ${error.message}`);
          }
        }
      }

      if (validCount < totalCount) {
        log.warn(`Validated ${validCount}/${totalCount} entries successfully for ${filePath}`);
        if (duplicateCount > 0) {
          log.info(`Skipped ${duplicateCount} duplicate entries for ${filePath}`);
        }
      }

      if (processedEntries.length > 0) {
        const firstEntryId = processedEntries[0].entry_id;
        const lastEntryId = processedEntries[processedEntries.length - 1].entry_id;
        log.info(`Stored ${processedEntries.length} burial register entries for page ${pageData.page_number} (${filePath}). Entry IDs: ${firstEntryId} to ${lastEntryId}`);
      } else {
        const errorMessage = duplicateCount > 0
          ? `${duplicateCount} entries were duplicates and ${totalCount - duplicateCount} entries failed validation or storage.`
          : 'All entries failed validation or storage.';
        log.warn(`No entries were stored for page ${pageData.page_number} (${filePath}). ${errorMessage}`);
      }

      await fs.unlink(filePath);
      log.info(`Cleaned up processed burial register file: ${filePath}`);

      return {
        entries: processedEntries,
        pageData
      };
    }

    // Handle monument_classification processing
    if (sourceType === 'monument_classification') {
      const startTime = Date.now();
      log.info(`Processing monument classification via ${providerName}: ${filePath}`);

      // Step 1: Get prompt instance
      const promptInstance = getPrompt(providerName, 'monumentClassification', promptVersion);
      const promptConfig = promptInstance.getProviderPrompt(providerName);

      const userPrompt = typeof promptConfig === 'string' ? promptConfig : promptConfig.userPrompt;
      const systemPrompt = typeof promptConfig === 'object' ? promptConfig.systemPrompt : undefined;

      // Step 2: Process through AI provider + validate (with retry)
      const { validationResult, usage: classificationUsage } = await processWithValidationRetry(
        provider,
        base64Image,
        userPrompt,
        { systemPrompt, promptTemplate: promptInstance, log, processingId },
        (raw) => promptInstance.validateAndConvert(raw)
      );

      const apiDuration = Date.now() - startTime;
      log.info(`Monument classification API call completed in ${apiDuration}ms for ${filePath}`);

      const validatedData = validationResult.data;
      const classificationConfidenceScores = validationResult.confidenceScores;
      const classificationValidationWarnings = validationResult.validationWarnings;

      // Extract confidence metadata
      if (classificationConfidenceScores && config.confidence?.enabled !== false) {
        validatedData.confidence_scores = classificationConfidenceScores;
        const threshold = config.confidence?.reviewThreshold ?? 0.70;
        const allScores = Object.values(classificationConfidenceScores);
        const numericCount = allScores.filter(s => typeof s === 'number').length;
        validatedData.confidence_coverage = allScores.length > 0 ? numericCount / allScores.length : null;
        validatedData.needs_review = allScores.some(s => typeof s === 'number' && s < threshold) ? 1 : 0;
      }

      // Extract validation warnings
      if (classificationValidationWarnings && classificationValidationWarnings.length > 0) {
        validatedData.validation_warnings = classificationValidationWarnings;
        validatedData.needs_review = 1; // force flag even if confidence disabled
      }

      log.info(`${providerName} monument classification response validated successfully for ${filePath}`);

      // Step 3: Add metadata
      const filename = path.basename(filePath);
      validatedData.fileName = filename;
      validatedData.ai_provider = providerName;
      validatedData.model_version = provider.getModelVersion();
      validatedData.prompt_template = 'monumentClassification';
      validatedData.prompt_version = promptInstance.version;
      validatedData.source_type = sourceType;

      // Inject cost data
      {
        const modelVersion = provider.getModelVersion();
        const costConfig = config.costs?.[providerName]?.[modelVersion] || {};
        validatedData.input_tokens = classificationUsage.input_tokens;
        validatedData.output_tokens = classificationUsage.output_tokens;
        validatedData.estimated_cost_usd = calculateCost(classificationUsage, costConfig);
      }

      // Attach processing ID
      validatedData.processing_id = processingId;

      // Step 4: Store in database
      await monumentClassificationStorage.storeClassification(validatedData);

      log.info(`Monument classification data for ${filePath} stored in database with model: ${providerName}`);

      // Clean up file after processing
      await fs.unlink(filePath);
      log.info(`Cleaned up processed monument classification file: ${filePath}`);

      return validatedData;
    }

    // Get the appropriate prompt for this provider
    const promptInstance = getPrompt(providerName, promptTemplate, promptVersion);
    const promptConfig = promptInstance.getProviderPrompt(providerName);

    // Extract the user prompt (the actual prompt text) and pass systemPrompt via options
    const userPrompt = typeof promptConfig === 'string' ? promptConfig : promptConfig.userPrompt;
    const systemPrompt = typeof promptConfig === 'object' ? promptConfig.systemPrompt : undefined;

    // For monument photos, prepare filename-based memorial number injection
    const filename = path.basename(filePath);
    const filenameMemorialNumber = getMemorialNumberForMonument(filename, sourceType);

    try {
      // Process image + validate with retry
      const { validationResult, usage: memUsage } = await processWithValidationRetry(
        provider,
        base64Image,
        userPrompt,
        { systemPrompt, promptTemplate: promptInstance, log, processingId },
        (rawExtractedData) => {
          // For monument photos, inject memorial number from filename if not provided by OCR
          let enhancedData = { ...rawExtractedData };
          if (sourceType === 'monument_photo' && filenameMemorialNumber) {
            const rawMemNum = enhancedData.memorial_number;
            const effectiveMemNum = (rawMemNum !== null && typeof rawMemNum === 'object' && 'value' in rawMemNum)
              ? rawMemNum.value
              : rawMemNum;
            const PLACEHOLDER_VALUES = ['n/a', 'null', 'unknown', 'none'];
            const memNumIsAbsent = !effectiveMemNum ||
              (typeof effectiveMemNum === 'string' &&
                PLACEHOLDER_VALUES.includes(effectiveMemNum.trim().toLowerCase()));

            if (memNumIsAbsent) {
              enhancedData.memorial_number = filenameMemorialNumber;
              log.info(`[FileProcessing] Injected memorial number from filename: ${filenameMemorialNumber} for ${filename}`);
            } else {
              log.info(`[FileProcessing] OCR provided memorial number: ${effectiveMemNum}, keeping it over filename: ${filenameMemorialNumber}`);
            }
          }

          return promptInstance.validateAndConvert(enhancedData);
        }
      );

      // Log the validated data for debugging
      const extractedData = validationResult.data;
      const memConfidenceScores = validationResult.confidenceScores;
      const memValidationWarnings = validationResult.validationWarnings;

      log.debugPayload(`Raw ${providerName} API response for ${filePath}:`, extractedData);

      // Extract confidence metadata
      if (memConfidenceScores && config.confidence?.enabled !== false) {
        extractedData.confidence_scores = memConfidenceScores;
        const threshold = config.confidence?.reviewThreshold ?? 0.70;
        const allScores = Object.values(memConfidenceScores);
        const numericCount = allScores.filter(s => typeof s === 'number').length;
        extractedData.confidence_coverage = allScores.length > 0 ? numericCount / allScores.length : null;
        extractedData.needs_review = allScores.some(s => typeof s === 'number' && s < threshold) ? 1 : 0;
      }

      // Extract validation warnings
      if (memValidationWarnings && memValidationWarnings.length > 0) {
        extractedData.validation_warnings = memValidationWarnings;
        extractedData.needs_review = 1; // force flag even if confidence disabled
      }

      log.info(`${providerName} API response processed successfully for ${filePath}`);
      log.debugPayload(`Processed ${providerName} data for ${filePath}:`, extractedData);

      // Add metadata to the extracted data
      extractedData.fileName = filename;
      extractedData.ai_provider = providerName;
      extractedData.model_version = provider.getModelVersion();
      extractedData.prompt_template = promptTemplate;
      extractedData.prompt_version = promptInstance.version;
      extractedData.source_type = sourceType;
      // Include site_code for mobile uploads (site isolation)
      if (options.site_code) {
        extractedData.site_code = options.site_code;
      }

      // Inject cost data
      {
        const modelVersion = provider.getModelVersion();
        const costConfig = config.costs?.[providerName]?.[modelVersion] || {};
        extractedData.input_tokens       = memUsage.input_tokens;
        extractedData.output_tokens      = memUsage.output_tokens;
        extractedData.estimated_cost_usd = calculateCost(memUsage, costConfig);
      }

      // Attach processing ID
      extractedData.processing_id = processingId;

      // Store in database
      await storeMemorial(extractedData);

      log.info(`OCR text for ${filePath} stored in database with model: ${providerName}`);

      // Clean up the file after successful processing
      await fs.unlink(filePath);
      log.info(`Cleaned up processed file: ${filePath}`);

      return extractedData;
    } catch (error) {
      // Check if this is an empty sheet error
      if (isEmptySheetError(error)) {
        log.warn(`Empty sheet detected for ${filePath}: ${error.message}`);

        // Return error info instead of throwing
        const errorResult = {
          fileName: path.basename(filePath),
          error: true,
          errorType: error.type || 'empty_sheet',
          errorMessage: error.message,
          ai_provider: providerName,
          model_version: provider.getModelVersion(),
          source_type: sourceType,
          processing_id: processingId
        };

        // Clean up the file even for empty sheets
        await fs.unlink(filePath);
        log.info(`Cleaned up empty sheet file: ${filePath}`);

        return errorResult;
      }

      // Re-throw other errors
      log.error(`Validation error for ${filePath}: ${error.message}`);
      throw error;
    }
  } catch (error) {
    log.error(`Error processing file ${filePath}:`, error);
    throw error;
  }
}

module.exports = { processFile };
