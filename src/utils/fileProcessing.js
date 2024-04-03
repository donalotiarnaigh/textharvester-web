const fs = require("fs");
const logger = require("./logger"); // Assuming logger is modularized or its path adjusted
const config = require("../../config.json");
const OpenAI = require("openai");

const openai = new OpenAI(process.env.OPENAI_API_KEY);

/**
 * Enhances the processFile function with detailed logging for better tracking and debugging.
 * Processes a given file by reading and sending its contents to the OpenAI API for OCR processing.
 * @param {string} filePath The path to the file to be processed.
 * @returns {Promise} A promise that resolves with the API response or rejects with an error.
 */
async function processFile(filePath) {
  logger.info(`Starting to process file: ${filePath}`);
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: "base64" }, async (err, base64Image) => {
      if (err) {
        logger.error(`Error reading file ${filePath}:`, err);
        reject(`Error reading file ${filePath}`);
        cleanupFile(filePath);
        return;
      }

      logger.info(
        `File ${filePath} read successfully. Proceeding with OCR processing.`
      );

      const requestPayload = {
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You're an expert in OCR and are working in a heritage/genealogy context assisting in data processing post graveyard survey. Examine these images and extract the handwritten text from the inscription field for each memorial number - no other fields. Respond in JSON format only. e.g., {memorial_number: 69, inscription: SACRED HEART OF JESUS HAVE MERCY ON THE SOUL OF THOMAS RUANE LISNAGROOBE WHO DIED APRIL 16th 1923 AGED 74 YRS AND OF HIS WIFE MARGARET RUANE DIED JULY 26th 1929 AGED 78 YEARS R. I. P. ERECTED BY THEIR FOND SON THOMAS RUANE PHILADELPHIA USA}. If no memorial number or inscription is visible in an image, return a JSON with NULL in each field",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 3000,
      };

      try {
        const response = await openai.chat.completions.create(requestPayload);

        if (response && response.choices && response.choices.length > 0) {
          const ocrText = response.choices[0].message.content;
          logger.info(`OCR text for ${filePath}: ${ocrText}`);
          storeResults(ocrText);
          resolve(ocrText);
        } else {
          logger.info(`No OCR data received for ${filePath}.`);
          reject(new Error(`No OCR data received for ${filePath}.`));
        }
      } catch (error) {
        logger.error(`Error in processing file ${filePath}:`, error);
        reject(error);
      } finally {
        cleanupFile(filePath);
        logger.info(`Cleanup completed for file ${filePath}.`);
      }
    });
  });
}

function cleanupFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      logger.error(`Error deleting file ${filePath}:`, err);
    } else {
      logger.info(`Successfully deleted file ${filePath}`);
    }
  });
}

/**
 * Stores OCR results into a JSON file.
 * @param {Object} ocrData - The OCR data to be stored.
 */
function storeResults(ocrText) {
  const resultsPath = config.resultsPath;

  logger.info("Starting to store OCR results...");

  try {
    let existingResults = [];

    // Check if the results file exists and load existing results
    if (fs.existsSync(resultsPath)) {
      logger.info("Loading existing results from results.json...");
      const resultsData = fs.readFileSync(resultsPath, "utf8");
      existingResults = JSON.parse(resultsData);
    } else {
      logger.info("No existing results found. Creating new results file.");
    }

    // The OCR text already includes the JSON format, but it's as a string
    // First, remove the ```json and ``` that might be wrapping the actual JSON string
    const cleanedOcrText = ocrText.replace(/```json\n|\n```/g, "").trim();

    // Parse the cleaned OCR text to an actual JSON object
    const parsedData = JSON.parse(cleanedOcrText);

    // Since existingResults is an array, ensure parsedData is also in array format
    const newData = Array.isArray(parsedData) ? parsedData : [parsedData];

    // Combine existing results with the new data
    const combinedResults = existingResults.concat(newData);

    // Save the combined results back to the file
    fs.writeFileSync(
      resultsPath,
      JSON.stringify(combinedResults, null, 2),
      "utf8"
    );
    logger.info(`Successfully stored new result(s) in results.json.`);
  } catch (err) {
    logger.error("Error while storing OCR results:", err);
  }
}

module.exports = { processFile, cleanupFile, storeResults }; // Adjust based on what's moved
