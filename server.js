const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");
require("dotenv").config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI(process.env.OPENAI_API_KEY);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage }).array("file", 100); // Set a limit for the number of files (e.g., 10)

// Define a global queue to hold file paths
let fileQueue = [];
let totalFiles = 0;
let processedFiles = 0;

/**
 * Adds uploaded files to the queue.
 * @param {Array} files - Array of file objects as provided by multer.
 */
function enqueueFiles(files) {
  console.log("Starting to enqueue files...");
  files.forEach((file, index) => {
    fileQueue.push(file.path);
    console.log(
      `File ${index + 1} [${file.originalname}] enqueued successfully. Path: ${
        file.path
      }`
    );
  });
  console.log(
    `Total of ${files.length} file(s) enqueued. Queue length is now: ${fileQueue.length}`
  );
}

let isProcessing = false; // Flag to prevent concurrent processing

function checkAndProcessNextFile() {
  console.log("Checking for next file to process...");
  if (isProcessing) {
    console.log("Processing is already underway. Exiting check.");
    return;
  }
  if (fileQueue.length === 0) {
    if (!isProcessing) {
      // Call setProcessingCompleteFlag only if processing is complete and no files are in the queue
      setProcessingCompleteFlag();
      console.log("All files processed. Processing complete flag set.");
    }
    console.log("No files in the queue to process. Exiting check.");
    return;
  }

  isProcessing = true; // Set the flag to indicate processing is underway
  console.log("Processing flag set. Attempting to dequeue next file.");
  const filePath = dequeueFile(); // Dequeue the next file

  if (filePath) {
    console.log(
      `Dequeued file for processing: ${filePath}. Initiating processing.`
    );
    processFile(filePath)
      .then(() => {
        console.log(`File processing completed: ${filePath}.`);
        processedFiles++;
        isProcessing = false; // Reset the flag after successful processing
        console.log("Processing flag reset. Checking for next file.");
        checkAndProcessNextFile(); // Immediately try to process the next file
      })
      .catch((error) => {
        console.error(`Error processing file ${filePath}: ${error}`);
        isProcessing = false; // Reset the flag on error
        console.log(
          "Processing flag reset due to error. Will retry processing after delay."
        );
        setTimeout(() => {
          console.log("Retrying file processing after delay.");
          checkAndProcessNextFile(); // Retry after a 10-second delay
        }, 1000 * 10);
      });
  } else {
    isProcessing = false; // Reset the flag if no file was dequeued
    console.log("No file was dequeued. Processing flag reset.");
    // If after attempting to dequeue we find the queue empty, set the processing completion flag
    if (fileQueue.length === 0 && !isProcessing) {
      setProcessingCompleteFlag();
      console.log("All files processed. Processing complete flag set.");
    }
  }
}

/**
 * Enhances the dequeueFile function with additional logging to track the queue's state.
 * Removes and returns the next file from the queue.
 * @returns {string|null} The path of the next file to process, or null if the queue is empty.
 */
function dequeueFile() {
  console.log(
    `Attempting to dequeue a file. Current queue length: ${fileQueue.length}.`
  );
  if (fileQueue.length > 0) {
    const nextFilePath = fileQueue.shift(); // Removes the first element from the queue
    console.log(
      `Dequeued file for processing: ${nextFilePath}. Remaining queue length: ${fileQueue.length}.`
    );
    return nextFilePath;
  } else {
    console.log("Queue is empty. No files to dequeue.");
    return null;
  }
}

app.use(express.static("public"));

// The /upload route handler
app.post("/upload", (req, res) => {
  console.log("Received an upload request.");
  const upload = multer({ storage: storage }).fields([
    { name: "file", maxCount: 100 }, // For individual files
    { name: "folder", maxCount: 1000 }, // For folder uploads
  ]);

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle multer-specific upload error
      console.error("Multer upload error:", err);
      return res.status(500).send("Multer upload error.");
    } else if (err) {
      // Handle unknown upload error
      console.error("Unknown upload error:", err);
      return res.status(500).send("Unknown upload error.");
    }

    // Combine files from both 'file' and 'folder' inputs
    const files = [...(req.files.file || []), ...(req.files.folder || [])];

    if (files.length === 0) {
      // Handle no file uploaded
      console.log("No files uploaded.");
      return res.status(400).send("No files uploaded.");
    }

    console.log(`Received upload request with ${files.length} files.`);
    files.forEach((file, index) =>
      console.log(`File ${index + 1}: ${file.originalname}`)
    );

    // Enqueue files for processing
    enqueueFiles(files);

    // Log file enqueueing
    console.log(`Enqueued ${files.length} file(s) for processing.`);

    // Clear any existing processing completion flag
    clearProcessingCompleteFlag();

    // Update totalFiles with the number of files uploaded
    totalFiles = files.length;
    processedFiles = 0; // Reset the processedFiles count for the new batch
    console.log(`Processing ${totalFiles} files.`);

    // Clear results.json before processing new files
    clearResultsFile();

    // Start processing files asynchronously
    startAsyncFileProcessing(files);

    console.log("Started processing files asynchronously.");

    // Immediately redirect to processing.html to monitor the progress
    res.redirect("/processing.html");
  });
});

function clearProcessingCompleteFlag() {
  const flagPath = "./data/processing_complete.flag";
  try {
    if (fs.existsSync(flagPath)) {
      fs.unlinkSync(flagPath);
      console.log("Cleared existing processing completion flag.");
    }
  } catch (err) {
    console.error("Error clearing processing completion flag:", err);
  }
}

function startAsyncFileProcessing() {
  // Initially check and process the next file in the queue
  checkAndProcessNextFile();
}

function clearResultsFile() {
  const resultsPath = "./data/results.json";
  try {
    fs.writeFileSync(resultsPath, JSON.stringify([]));
    console.log("Cleared results.json file.");
  } catch (err) {
    console.error("Error clearing results.json file:", err);
  }
}

/**
 * Enhances the processFile function with detailed logging for better tracking and debugging.
 * Processes a given file by reading and sending its contents to the OpenAI API for OCR processing.
 * @param {string} filePath The path to the file to be processed.
 * @returns {Promise} A promise that resolves with the API response or rejects with an error.
 */
async function processFile(filePath) {
  console.log(`Starting to process file: ${filePath}`);
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: "base64" }, async (err, base64Image) => {
      if (err) {
        console.error(`Error reading file ${filePath}:`, err);
        reject(`Error reading file ${filePath}`);
        cleanupFile(filePath);
        return;
      }

      console.log(
        `File ${filePath} read successfully. Proceeding with OCR processing.`
      );

      // Corrected request payload structure and method call
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
          console.log(`OCR text for ${filePath}: ${ocrText}`);
          storeResults(ocrText); // Call storeResults with the OCR text
          resolve(ocrText); // Resolving with the OCR text if present
        } else {
          console.log(`No OCR data received for ${filePath}.`);
          reject(new Error(`No OCR data received for ${filePath}.`)); // Rejecting the promise if no data received
        }
      } catch (error) {
        console.error(`Error in processing file ${filePath}:`, error);
        reject(error); // Rejecting the promise on error
      } finally {
        cleanupFile(filePath); // Ensuring cleanup in every scenario
        console.log(`Cleanup completed for file ${filePath}.`);
      }
    });
  });
}

function cleanupFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting file ${filePath}:`, err);
    } else {
      console.log(`Successfully deleted file ${filePath}`);
    }
  });
}

function handleProcessingError(error, filePath) {
  // Implement logic to handle different types of errors
  // For example, if error is due to rate limiting, you might retry after a delay
  console.error(`Processing error for file ${filePath}:`, error.message);
  // Add retry logic or other error handling here as needed
}

/**
 * Stores OCR results into a JSON file.
 * @param {Object} ocrData - The OCR data to be stored.
 */
function storeResults(ocrText) {
  const resultsPath = "./data/results.json";

  console.log("Starting to store OCR results...");

  try {
    let existingResults = [];

    // Check if the results file exists and load existing results
    if (fs.existsSync(resultsPath)) {
      console.log("Loading existing results from results.json...");
      const resultsData = fs.readFileSync(resultsPath, "utf8");
      existingResults = JSON.parse(resultsData);
    } else {
      console.log("No existing results found. Creating new results file.");
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
    console.log(`Successfully stored new result(s) in results.json.`);
  } catch (err) {
    console.error("Error while storing OCR results:", err);
  }
}

function setProcessingCompleteFlag() {
  const flagPath = "./data/processing_complete.flag";
  try {
    // Write an empty file or some content to indicate completion
    fs.writeFileSync(flagPath, "complete");
    console.log("Processing completion flag set.");
  } catch (err) {
    console.error("Error setting processing completion flag:", err);
  }
}

app.get("/processing-status", (req, res) => {
  const flagPath = path.join(__dirname, "data", "processing_complete.flag");

  // Check if the processing complete flag file exists
  fs.exists(flagPath, (exists) => {
    if (exists) {
      // Read the content of the flag file
      fs.readFile(flagPath, "utf8", (err, data) => {
        if (err) {
          console.error("Error reading processing complete flag:", err);
          return res.status(500).send("Error checking processing status.");
        }
        // Check if the flag file indicates completion
        if (data === "complete") {
          res.json({ status: "complete", progress: 100 });
        } else {
          // If file content is not as expected, treat as still processing
          let progress =
            totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;
          res.json({ status: "processing", progress: progress.toFixed(2) });
        }
      });
    } else {
      // If flag file doesn't exist, treat as still processing
      let progress = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;
      res.json({ status: "processing", progress: progress.toFixed(2) });
    }
  });
});

app.get("/results-data", (req, res) => {
  const resultsPath = "./data/results.json";

  try {
    const data = fs.readFileSync(resultsPath, "utf8");
    console.log("Sending results data.");
    res.json(JSON.parse(data));
  } catch (err) {
    console.error("Error reading results file:", err);
    res.status(500).send("Unable to retrieve results.");
  }
});

app.get("/download-results", (req, res) => {
  const resultsPath = "./data/results.json";

  try {
    res.setHeader("Content-Disposition", "attachment; filename=results.json");
    res.setHeader("Content-Type", "application/json");
    res.sendFile(path.join(__dirname, resultsPath));
  } catch (err) {
    console.error("Error reading results file:", err);
    res.status(500).send("Unable to retrieve results.");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
