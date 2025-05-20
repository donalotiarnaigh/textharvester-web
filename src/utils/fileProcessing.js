const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger'); // Assuming logger is modularized or its path adjusted
const { createProvider } = require('./modelProviders');
const { storeMemorial } = require('./database');
const { getPrompt } = require('./prompts/templates/providerTemplates');

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
    const promptText = promptInstance.getProviderPrompt(providerName);
    
    // Process the image using the selected provider
    const rawExtractedData = await provider.processImage(base64Image, promptText);
    
    // Validate and convert the data according to our type definitions
    const extractedData = promptInstance.validateAndConvert(rawExtractedData);
    
    logger.info(`${providerName} API response for ${filePath}`);
    logger.info(JSON.stringify(extractedData, null, 2));
    
    // Add metadata to the extracted data
    extractedData.fileName = path.basename(filePath);
    extractedData.ai_provider = providerName;
    extractedData.model_version = provider.getModelVersion();
    extractedData.prompt_template = promptTemplate;
    extractedData.prompt_version = promptInstance.version;
    
    // Store in database
    await storeMemorial(extractedData);
    
    logger.info(`OCR text for ${filePath} stored in database with model: ${providerName}`);
    
    // Clean up the file after successful processing
    await fs.unlink(filePath);
    logger.info(`Cleaned up processed file: ${filePath}`);
    
    return extractedData;
  } catch (error) {
    logger.error(`Error processing file ${filePath}:`, error);
    throw error;
  }
}

module.exports = { processFile };
