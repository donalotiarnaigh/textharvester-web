const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger'); // Assuming logger is modularized or its path adjusted
const { createProvider } = require('./modelProviders');
const { storeMemorial } = require('./database');
const { getPrompt } = require('./prompts/templates/providerTemplates');
const { isEmptySheetError } = require('./errorTypes');

/**
 * Enhances the processFile function with detailed logging for better tracking and debugging.
 * Processes a given file by reading and sending its contents to the configured AI provider for OCR processing.
 * @param {string} filePath The path to the file to be processed.
 * @param {Object} options Optional configuration options including provider selection
 * @returns {Promise} A promise that resolves with the API response or rejects with an error.
 */
async function processFile(filePath, options = {}) {
  const providerName = options.provider || process.env.AI_PROVIDER || 'openai';
  const promptTemplate = options.promptTemplate || 'memorialOCR';
  const promptVersion = options.promptVersion || 'latest';
  const sourceType = options.source_type || 'record_sheet';
  
  logger.info(`Starting to process file: ${filePath} with provider: ${providerName}`);
  
  try {
    const base64Image = await fs.readFile(filePath, { encoding: 'base64' });
    logger.info(`File ${filePath} read successfully. Proceeding with OCR processing.`);

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
      // Validate and convert the data according to our type definitions
      const extractedData = promptInstance.validateAndConvert(rawExtractedData);
      
      logger.info(`${providerName} API response processed successfully for ${filePath}`);
      logger.debugPayload(`Processed ${providerName} data for ${filePath}:`, extractedData);
      
      // Add metadata to the extracted data
      extractedData.fileName = path.basename(filePath);
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
