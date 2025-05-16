const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger'); // Assuming logger is modularized or its path adjusted
const { createProvider } = require('./modelProviders');
const { storeMemorial } = require('./database');

/**
 * Enhances the processFile function with detailed logging for better tracking and debugging.
 * Processes a given file by reading and sending its contents to the configured AI provider for OCR processing.
 * @param {string} filePath The path to the file to be processed.
 * @param {Object} options Optional configuration options including provider selection
 * @returns {Promise} A promise that resolves with the API response or rejects with an error.
 */
async function processFile(filePath, options = {}) {
  const providerName = options.provider || process.env.AI_PROVIDER || 'openai';
  logger.info(`Starting to process file: ${filePath} with provider: ${providerName}`);
  
  try {
    const base64Image = await fs.readFile(filePath, { encoding: 'base64' });
    
    logger.info(
      `File ${filePath} read successfully. Proceeding with OCR processing.`
    );

    // Create the appropriate provider based on configuration
    const provider = createProvider({
      ...options,
      AI_PROVIDER: providerName
    });
    
    // The prompt text for OCR processing
    const prompt = 'You\'re an expert in OCR and are working in a heritage/genealogy context assisting in data processing post graveyard survey. Examine these images and extract the text as per the following details for each memorial: memorial number, first name, last name, year of death, and the inscription text. Respond in JSON format only, adhering to the order mentioned. e.g., {"memorial_number": "69", "first_name": "THOMAS", "last_name": "RUANE", "year_of_death": "1923", "inscription": "SACRED HEART OF JESUS HAVE MERCY ON THE SOUL OF THOMAS RUANE LISNAGROOBE WHO DIED APRIL 16th 1923 AGED 74 YRS AND OF HIS WIFE MARGARET RUANE DIED JULY 26th 1929 AGED 78 YEARS R. I. P. ERECTED BY THEIR FOND SON THOMAS RUANE PHILADELPHIA USA"}. If a memorial number, first name, last name, or year of death is not visible or the inscription is not present, return a JSON with NULL for the missing fields.';

    // Process the image using the selected provider
    const extractedData = await provider.processImage(base64Image, prompt);
    
    logger.info(`${providerName} API response for ${filePath}`);
    logger.info(JSON.stringify(extractedData, null, 2));
    
    // Add filename and model information to the extracted data
    extractedData.fileName = path.basename(filePath);
    extractedData.ai_provider = providerName;
    extractedData.model_version = provider.getModelVersion();
    
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
