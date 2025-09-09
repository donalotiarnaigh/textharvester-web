const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger'); // Assuming logger is modularized or its path adjusted
const { createProvider } = require('./modelProviders');
const { storeMemorial } = require('./database');
const { getPrompt } = require('./prompts/templates/providerTemplates');
const { isEmptySheetError } = require('./errorTypes');
const { getMemorialNumberForMonument } = require('./filenameParser');
const { optimizeImageForProvider, analyzeImageForProvider } = require('./imageProcessor');
const { detectAndCrop } = require('./imageProcessing/monumentCropper');
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
  const sourceType = options.source_type || 'record_sheet';
  
  // Select template based on source_type (unless custom template is provided)
  const promptTemplate = options.promptTemplate || 
    (sourceType === 'monument_photo' 
      ? 'monumentPhotoOCR'                    // NEW template for monuments
      : 'memorialOCR');                      // Existing record sheet template
  
  const promptVersion = options.promptVersion || 'latest';
  
  logger.info(`Processing ${path.basename(filePath)} with provider: ${providerName}, source: ${sourceType}, template: ${promptTemplate}`);
  
  try {
    let workingImage = filePath;
    if (sourceType === 'monument_photo' && config.monumentCropping?.enabled) {
      logger.info(`[MonumentCropper] Starting detection for ${filePath}`);
      const cropResult = await detectAndCrop(filePath);
      if (cropResult) {
        const { box, original } = cropResult;
        const reduction = 1 - (box.width * box.height) / (original.width * original.height);
        logger.info(`[MonumentCropper] Cropping successful: box=${JSON.stringify(box)}, reduction=${(reduction * 100).toFixed(1)}%`);
        logger.trackMonumentCrop(true);
        workingImage = cropResult.buffer;
      } else {
        logger.warn(`[MonumentCropper] Cropping failed for ${filePath}, using original image`);
        logger.trackMonumentCrop(false);
      }
    }

    // Analyze image to see if optimization is needed
    const analysis = await analyzeImageForProvider(workingImage, providerName);

    let base64Image;
    if (analysis.needsOptimization) {
      logger.info(`[ImageProcessor] Image requires optimization: ${analysis.reasons.join(', ')}`);
      base64Image = await optimizeImageForProvider(workingImage, providerName);
      logger.info(`File ${filePath} optimized and processed successfully. Proceeding with OCR processing.`);
    } else {
      // Image is already within limits, read directly
      if (Buffer.isBuffer(workingImage)) {
        base64Image = workingImage.toString('base64');
      } else {
        base64Image = await fs.readFile(workingImage, { encoding: 'base64' });
      }
      logger.info(`File ${filePath} read successfully (no optimization needed). Proceeding with OCR processing.`);
    }

    // Create provider instance
    const provider = createProvider({
      ...options,
      AI_PROVIDER: providerName
    });
    
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
