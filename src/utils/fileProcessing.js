const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger'); // Assuming logger is modularized or its path adjusted
const { createProvider } = require('./modelProviders');
const { storeMemorial } = require('./database');
const { getPrompt } = require('./prompts/templates/providerTemplates');
const { isEmptySheetError } = require('./errorTypes');
const burialRegisterFlattener = require('./burialRegisterFlattener');
const burialRegisterStorage = require('./burialRegisterStorage');
const { getMemorialNumberForMonument } = require('./filenameParser');
const { optimizeImageForProvider, analyzeImageForProvider } = require('./imageProcessor');
const config = require('../../config.json');

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
  
  // Select template based on source_type (unless custom template is provided)
  const promptTemplate = options.promptTemplate || 
    (sourceType === 'burial_register'
      ? 'burialRegister'
      : sourceType === 'monument_photo' 
        ? 'monumentPhotoOCR'
        : 'memorialOCR');
  
  const promptVersion = options.promptVersion || 'latest';
  
  logger.info(`Processing ${path.basename(filePath)} with provider: ${providerName}, source: ${sourceType}, template: ${promptTemplate}`);
  
  try {
    // For burial register, skip image optimization (handled differently)
    // For other types, analyze image to see if optimization is needed
    let base64Image;
    if (sourceType === 'burial_register') {
      base64Image = await fs.readFile(filePath, { encoding: 'base64' });
      logger.info(`File ${filePath} read successfully (burial register, no optimization). Proceeding with OCR processing.`);
    } else {
      // Analyze image to see if optimization is needed
      const analysis = await analyzeImageForProvider(filePath, providerName);
      if (analysis.needsOptimization) {
        logger.info(`[ImageProcessor] Image requires optimization: ${analysis.reasons.join(', ')}`);
        base64Image = await optimizeImageForProvider(filePath, providerName);
        logger.info(`File ${filePath} optimized and processed successfully. Proceeding with OCR processing.`);
      } else {
        // Image is already within limits, read directly
        base64Image = await fs.readFile(filePath, { encoding: 'base64' });
        logger.info(`File ${filePath} read successfully (no optimization needed). Proceeding with OCR processing.`);
      }
    }

    // Create provider instance
    const provider = createProvider({
      ...options,
      AI_PROVIDER: providerName
    });

    if (sourceType === 'burial_register') {
      const startTime = Date.now();
      logger.info(`Processing burial register file via ${providerName}: ${filePath}`);

      const promptInstance = getPrompt(providerName, 'burialRegister', promptVersion);
      const promptConfig = promptInstance.getProviderPrompt(providerName);

      const userPrompt = typeof promptConfig === 'string' ? promptConfig : promptConfig.userPrompt;
      const systemPrompt = typeof promptConfig === 'object' ? promptConfig.systemPrompt : undefined;

      const pageDataRaw = await provider.processImage(base64Image, userPrompt, {
        systemPrompt: systemPrompt,
        promptTemplate: promptInstance
      });

      const apiDuration = Date.now() - startTime;
      logger.info(`Burial register API call completed in ${apiDuration}ms for ${filePath}`);
      logger.debugPayload(`Raw ${providerName} burial register response for ${filePath}:`, pageDataRaw);

      // Inject user-provided volume_id before validation (API can't extract this from page)
      const volumeId = options.volume_id || options.volumeId || config.burialRegister?.volumeId || 'vol1';
      if (pageDataRaw && typeof pageDataRaw === 'object') {
        pageDataRaw.volume_id = volumeId;
      }

      const pageData = promptInstance.validateAndConvertPage(pageDataRaw);

      logger.debugPayload(`Validated burial register page data for ${filePath}:`, pageData);

      const entries = burialRegisterFlattener.flattenPageToEntries(pageData, {
        provider: providerName,
        model: provider.getModelVersion(),
        filePath
      });

      await burialRegisterStorage.storePageJSON(
        pageData,
        providerName,
        pageData.volume_id,
        pageData.page_number
      );

      logger.info(`Prepared ${entries.length} burial register entries for ${filePath}`);

      const processedEntries = [];
      const filename = path.basename(filePath);
      let validCount = 0;
      let totalCount = entries.length;

      for (const entry of entries) {
        try {
          const validatedEntry = promptInstance.validateAndConvertEntry(entry);

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
            source_type: 'burial_register'
          };

          await burialRegisterStorage.storeBurialRegisterEntry(entryWithMetadata);
          processedEntries.push(entryWithMetadata);
          validCount++;
        } catch (error) {
          logger.warn(`Entry validation failed for entry_id=${entry.entry_id || 'unknown'}, page_number=${pageData.page_number}, volume_id=${pageData.volume_id}: ${error.message}`);
        }
      }

      if (validCount < totalCount) {
        logger.warn(`Validated ${validCount}/${totalCount} entries successfully for ${filePath}`);
      }

      if (processedEntries.length > 0) {
        const firstEntryId = processedEntries[0].entry_id;
        const lastEntryId = processedEntries[processedEntries.length - 1].entry_id;
        logger.info(`Stored ${processedEntries.length} burial register entries for page ${pageData.page_number} (${filePath}). Entry IDs: ${firstEntryId} to ${lastEntryId}`);
      } else {
        logger.warn(`No entries were stored for page ${pageData.page_number} (${filePath})`);
      }

      await fs.unlink(filePath);
      logger.info(`Cleaned up processed burial register file: ${filePath}`);

      return { entries: processedEntries, pageData };
    }
    
    // Get the appropriate prompt for this provider
    const promptInstance = getPrompt(providerName, promptTemplate, promptVersion);
    const promptConfig = promptInstance.getProviderPrompt(providerName);
    
    // Extract the user prompt (the actual prompt text) and pass systemPrompt via options
    const userPrompt = typeof promptConfig === 'string' ? promptConfig : promptConfig.userPrompt;
    const systemPrompt = typeof promptConfig === 'object' ? promptConfig.systemPrompt : undefined;
    
    // Process the image using the selected provider
    const rawExtractedData = await provider.processImage(base64Image, userPrompt, {
      systemPrompt: systemPrompt,
      promptTemplate: promptInstance
    });
    
    // Log the raw API response for debugging
    logger.debugPayload(`Raw ${providerName} API response for ${filePath}:`, rawExtractedData);
    
    try {
      // For monument photos, inject memorial number from filename if not provided by OCR
      const filename = path.basename(filePath);
      const filenameMemorialNumber = getMemorialNumberForMonument(filename, sourceType);
      
      // Enhance raw data with filename-based memorial number for monuments
      let enhancedData = { ...rawExtractedData };
      if (sourceType === 'monument_photo' && filenameMemorialNumber) {
        // Use filename memorial number if OCR didn't provide one or provided null
        if (!enhancedData.memorial_number || enhancedData.memorial_number === null) {
          enhancedData.memorial_number = filenameMemorialNumber;
          logger.info(`[FileProcessing] Injected memorial number from filename: ${filenameMemorialNumber} for ${filename}`);
        } else {
          logger.info(`[FileProcessing] OCR provided memorial number: ${enhancedData.memorial_number}, keeping it over filename: ${filenameMemorialNumber}`);
        }
      }
      
      // Validate and convert the data according to our type definitions
      const extractedData = promptInstance.validateAndConvert(enhancedData);
      
      logger.info(`${providerName} API response processed successfully for ${filePath}`);
      logger.debugPayload(`Processed ${providerName} data for ${filePath}:`, extractedData);
      
      // Add metadata to the extracted data
      extractedData.fileName = filename;
      extractedData.ai_provider = providerName;
      extractedData.model_version = provider.getModelVersion();
      extractedData.prompt_template = promptTemplate;
      extractedData.prompt_version = promptInstance.version;
      extractedData.source_type = sourceType;
      
      // Store in database
      await storeMemorial(extractedData);
      
      logger.info(`OCR text for ${filePath} stored in database with model: ${providerName}`);
      
      // Clean up the file after successful processing
      await fs.unlink(filePath);
      logger.info(`Cleaned up processed file: ${filePath}`);
      
      return extractedData;
    } catch (error) {
      // Check if this is an empty sheet error
      if (isEmptySheetError(error)) {
        logger.warn(`Empty sheet detected for ${filePath}: ${error.message}`);
        
        // Return error info instead of throwing
        const errorResult = {
          fileName: path.basename(filePath),
          error: true,
          errorType: error.type || 'empty_sheet',
          errorMessage: error.message,
          ai_provider: providerName,
          model_version: provider.getModelVersion(),
          source_type: sourceType
        };
        
        // Clean up the file even for empty sheets
        await fs.unlink(filePath);
        logger.info(`Cleaned up empty sheet file: ${filePath}`);
        
        return errorResult;
      }
      
      // Re-throw other errors
      logger.error(`Validation error for ${filePath}: ${error.message}`);
      throw error;
    }
  } catch (error) {
    logger.error(`Error processing file ${filePath}:`, error);
    throw error;
  }
}

module.exports = { processFile };
