const fs = require("fs");
const { processFile } = require("./fileProcessing");
const logger = require("./logger");
const config = require("../../config.json");

let fileQueue = [];
let isProcessing = false;
let processedFiles = 0;
let totalFiles = 0;

function clearResultsFile() {
  const resultsPath = config.resultsPath;
  try {
    fs.writeFileSync(resultsPath, JSON.stringify([]));
    logger.info("Cleared results.json file.");
  } catch (err) {
    logger.error("Error clearing results.json file:", err);
  }
}

function enqueueFiles(files) {
  logger.info(`Enqueue operation started at ${new Date().toISOString()}`);

  // If no files are being processed, this is a new session, so reset the counters
  if (fileQueue.length === 0 && !isProcessing) {
    resetFileProcessingState();
  }

  files.forEach((file, index) => {
    const filePath = file.path ? file.path : file; // Check if the file is an object or a string
    const originalName = file.originalname
      ? file.originalname
      : path.basename(file);

    fileQueue.push(filePath);
    logger.info(
      `File ${index + 1} [${originalName}] enqueued. Path: ${filePath}`
    );
  });

  // Update totalFiles with the number of new files only after ensuring it's a new session
  totalFiles += files.length;
  logger.info(
    `Enqueued ${files.length} new file(s). Queue length is now: ${fileQueue.length}. Total files to process: ${totalFiles}`
  );

  checkAndProcessNextFile();
}

// Reset the file processing state at the beginning of a new session
function resetFileProcessingState() {
  processedFiles = 0;
  totalFiles = 0;
  logger.info("File processing state reset for a new session.");
}

function dequeueFile() {
  logger.info(
    `Attempting to dequeue a file. Current queue length: ${fileQueue.length}.`
  );
  if (fileQueue.length > 0) {
    const nextFilePath = fileQueue.shift(); // Removes the first element from the queue
    logger.info(
      `Dequeued file for processing: ${nextFilePath}. Remaining queue length: ${fileQueue.length}.`
    );
    return nextFilePath;
  } else {
    logger.info("Queue is empty. No files to dequeue.");
    return null;
  }
}

function checkAndProcessNextFile() {
  logger.info("Checking for next file to process...");
  if (isProcessing) {
    logger.info("Processing is already underway. Exiting check.");
    return;
  }
  if (fileQueue.length === 0) {
    if (!isProcessing) {
      setProcessingCompleteFlag();
      logger.info("All files processed. Processing complete flag set.");
    }
    logger.info("No files in the queue to process. Exiting check.");
    return;
  }

  isProcessing = true; // Set the flag to indicate processing is underway
  logger.info("Processing flag set. Attempting to dequeue next file.");
  const filePath = dequeueFile(); // Dequeue the next file

  if (filePath) {
    logger.info(
      `Dequeued file for processing: ${filePath}. Initiating processing.`
    );
    processFile(filePath)
      .then(() => {
        logger.info(`File processing completed: ${filePath}.`);
        processedFiles++;
        checkForNextFile(); // Move flag reset and check to a new function
      })
      .catch((error) => {
        logger.error(`Error processing file ${filePath}: ${error}`);
        checkForNextFile(); // Handle flag reset and re-check even on error
      });
  } else {
    logger.info("No file was dequeued. Processing flag reset.");
    checkForNextFile(); // Handle resetting the flag if no file was dequeued
  }
}

function checkForNextFile() {
  isProcessing = false; // Reset the flag after processing or if there's an error
  if (fileQueue.length > 0) {
    logger.info("Processing flag reset. Checking for next file.");
    checkAndProcessNextFile(); // Immediately try to process the next file
  } else {
    setProcessingCompleteFlag();
    logger.info("All files processed. Processing complete flag set.");
  }
}

function setProcessingCompleteFlag() {
  const flagPath = config.processingCompleteFlagPath;
  try {
    // Write an empty file or some content to indicate completion
    fs.writeFileSync(flagPath, "complete");
    logger.info("Processing completion flag set.");
  } catch (err) {
    logger.error("Error setting processing completion flag:", err);
  }
}

function getTotalFiles() {
  return totalFiles;
}

function getProcessedFiles() {
  return processedFiles;
}

const path = require("path");

function cancelProcessing() {
  if (!isProcessing) {
    logger.info("No active processing to cancel.");
    return;
  }

  // Delete files from the upload directory
  fileQueue.forEach((file) => {
    const filePath = path.join(__dirname, "..", "..", file); // Adjusted path
    console.log("Attempting to delete file at path:", filePath);
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.error(`Error deleting file ${file}: ${err}`);
      } else {
        logger.info(`Deleted file ${file}`);
      }
    });
  });

  // Clear the file queue and reset processing flags
  fileQueue = [];
  isProcessing = false;
  processedFiles = 0;
  totalFiles = 0;
  logger.info("Processing has been cancelled and the queue has been cleared.");
}

module.exports = {
  clearResultsFile,
  enqueueFiles,
  dequeueFile,
  checkAndProcessNextFile,
  resetFileProcessingState,
  getTotalFiles,
  getProcessedFiles,
  cancelProcessing, // Export the new function
};
