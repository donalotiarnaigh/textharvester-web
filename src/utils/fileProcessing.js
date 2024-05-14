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
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Return a JSON object with the extracted text details.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You're an expert in OCR and are working in a heritage/genealogy context assisting in data processing post graveyard survey. Examine these images and extract the text as per the following details for each memorial: memorial number, first name, last name, year of death, and the inscription text. Respond in JSON format only, adhering to the order mentioned. e.g., {"memorial_number": "69", "first_name": "THOMAS", "last_name": "RUANE", "year_of_death": "1923", "inscription": "SACRED HEART OF JESUS HAVE MERCY ON THE SOUL OF THOMAS RUANE LISNAGROOBE WHO DIED APRIL 16th 1923 AGED 74 YRS AND OF HIS WIFE MARGARET RUANE DIED JULY 26th 1929 AGED 78 YEARS R. I. P. ERECTED BY THEIR FOND SON THOMAS RUANE PHILADELPHIA USA"}. If a memorial number, first name, last name, or year of death is not visible or the inscription is not present, return a JSON with NULL for the missing fields.`,
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
        response_format: { type: "json_object" }, // Ensures output is JSON formatted
        max_tokens: 3000,
      };

      try {
        const response = await openai.chat.completions.create(requestPayload);

        if (response && response.choices && response.choices.length > 0) {
          const ocrText = response.choices[0].message.content;
          logger.info(`OCR text for ${filePath}: ${ocrText}`);

          // Include unique filename in the results data
          const resultsData = {
            ocrText,
            uniqueFilename: filePath, // Pass the unique filename
          };

          storeResults(resultsData); // Store the results with the unique filename
          resolve(ocrText);
        } else {
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

function storeResults(resultsData) {
  const resultsPath = config.resultsPath;

  try {
    let existingResults = [];
    if (fs.existsSync(resultsPath)) {
      const existingData = fs.readFileSync(resultsPath, "utf8");
      existingResults = JSON.parse(existingData);
    }

    // Parse OCR text and extract required fields
    const parsedData = JSON.parse(resultsData.ocrText);

    const newResult = {
      filename: resultsData.uniqueFilename || "Unknown", // Include unique filename
      memorial_number: parsedData.memorial_number || null, // Extract from parsed data
      first_name: parsedData.first_name || null, // Extract from parsed data
      last_name: parsedData.last_name || null, // Extract from parsed data
      year_of_death: parsedData.year_of_death || null, // Extract from parsed data
      inscription: parsedData.inscription || null, // Extract from parsed data
    };

    const combinedResults = existingResults.concat(newResult);

    // Sort by memorial number with nulls at the end
    combinedResults.sort((a, b) => {
      const numA =
        a.memorial_number === null ? Infinity : parseInt(a.memorial_number, 10);
      const numB =
        b.memorial_number === null ? Infinity : parseInt(b.memorial_number, 10);
      return numA - numB;
    });

    fs.writeFileSync(
      resultsPath,
      JSON.stringify(combinedResults, null, 2),
      "utf8"
    );
    logger.info("Results successfully stored in results.json.");
  } catch (err) {
    logger.error("Error storing OCR results:", err);
  }
}

module.exports = { processFile, cleanupFile, storeResults }; // Adjust based on what's moved
