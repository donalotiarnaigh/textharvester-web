const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger'); // Assuming logger is modularized or its path adjusted
const OpenAI = require('openai');
const { storeMemorial } = require('./database');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

/**
 * Enhances the processFile function with detailed logging for better tracking and debugging.
 * Processes a given file by reading and sending its contents to the OpenAI API for OCR processing.
 * @param {string} filePath The path to the file to be processed.
 * @returns {Promise} A promise that resolves with the API response or rejects with an error.
 */
async function processFile(filePath) {
  logger.info(`Starting to process file: ${filePath}`);
  
  try {
    const base64Image = await fs.readFile(filePath, { encoding: 'base64' });
    
    logger.info(
      `File ${filePath} read successfully. Proceeding with OCR processing.`
    );

    const requestPayload = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Return a JSON object with the extracted text details.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'You\'re an expert in OCR and are working in a heritage/genealogy context assisting in data processing post graveyard survey. Examine these images and extract the text as per the following details for each memorial: memorial number, first name, last name, year of death, and the inscription text. Respond in JSON format only, adhering to the order mentioned. e.g., {"memorial_number": "69", "first_name": "THOMAS", "last_name": "RUANE", "year_of_death": "1923", "inscription": "SACRED HEART OF JESUS HAVE MERCY ON THE SOUL OF THOMAS RUANE LISNAGROOBE WHO DIED APRIL 16th 1923 AGED 74 YRS AND OF HIS WIFE MARGARET RUANE DIED JULY 26th 1929 AGED 78 YEARS R. I. P. ERECTED BY THEIR FOND SON THOMAS RUANE PHILADELPHIA USA"}. If a memorial number, first name, last name, or year of death is not visible or the inscription is not present, return a JSON with NULL for the missing fields.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' }, // Ensures output is JSON formatted
      max_tokens: 3000,
    };

    const result = await openai.chat.completions.create(requestPayload);
    const extractedData = JSON.parse(result.choices[0].message.content);
    
    // Add filename to the extracted data
    extractedData.fileName = path.basename(filePath);
    
    // Store in database
    await storeMemorial(extractedData);
    
    logger.info(`OCR text for ${filePath} stored in database`);
    
    // Clean up the file after successful processing
    await fs.unlink(filePath);
    logger.info(`Cleaned up processed file: ${filePath}`);
    
    return extractedData;
  } catch (error) {
    logger.error('Error in processing file:', error);
    // Still try to clean up even if processing failed
    try {
      await fs.unlink(filePath);
      logger.info(`Cleaned up file after error: ${filePath}`);
    } catch (cleanupError) {
      logger.error('Error cleaning up file:', cleanupError);
    }
    throw error;
  }
}

module.exports = { processFile };
