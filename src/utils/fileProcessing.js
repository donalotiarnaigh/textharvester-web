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
        model: "gpt-4-turbo",
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

function storeResults(ocrText) {
  const resultsPath = config.resultsPath;
  logger.info("Starting to store OCR results...");

  try {
    let existingResults = [];
    if (fs.existsSync(resultsPath)) {
      logger.info("Loading existing results from results.json...");
      const resultsData = fs.readFileSync(resultsPath, "utf8");
      existingResults = JSON.parse(resultsData);
    } else {
      logger.info("No existing results found. Creating new results file.");
    }

    // Remove Markdown code block syntax if present and handle NULL values
    const cleanedOcrText = ocrText
      .replace(/```json|```/g, "")
      .replace(/NULL/g, "null")
      .trim();

    let newData = JSON.parse(cleanedOcrText);

    const formattedData = Array.isArray(newData) ? newData : [newData];
    formattedData.forEach((item) => {
      item.memorial_number = item.memorial_number || null;
      item.first_name = item.first_name || null;
      item.last_name = item.last_name || null;
      item.year_of_death = item.year_of_death || null;
      item.inscription = item.inscription || null;
    });

    const combinedResults = existingResults.concat(formattedData);

    logger.info(
      "Before sorting:",
      combinedResults.map(
        (item) => `${item.memorial_number}: ${item.first_name}`
      )
    );

    // Sort combined results by memorial_number, treating null as Infinity
    combinedResults.sort((a, b) => {
      const numA =
        isNaN(parseInt(a.memorial_number, 10)) || a.memorial_number === "null"
          ? Infinity
          : parseInt(a.memorial_number, 10);
      const numB =
        isNaN(parseInt(b.memorial_number, 10)) || b.memorial_number === "null"
          ? Infinity
          : parseInt(b.memorial_number, 10);
      return numA - numB;
    });

    logger.info(
      "After sorting:",
      combinedResults.map(
        (item) => `${item.memorial_number}: ${item.first_name}`
      )
    );

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
