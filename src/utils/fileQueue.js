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
    fileQueue.push(file.path);
    logger.info(
      `File ${index + 1} [${file.originalname}] enqueued. Path: ${file.path}`
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

// Add functionality to reset `totalFiles` and `processedFiles` when needed
function resetFileProcessingState() {
  processedFiles = 0;
  totalFiles = 0; // Ensure totalFiles is also reset to 0
  logger.info("File processing state has been reset for a new session.");
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
      // Call setProcessingCompleteFlag only if processing is complete and no files are in the queue
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
        isProcessing = false; // Reset the flag after successful processing
        logger.info("Processing flag reset. Checking for next file.");
        checkAndProcessNextFile(); // Immediately try to process the next file
      })
      .catch((error) => {
        logger.error(`Error processing file ${filePath}: ${error}`);
        isProcessing = false; // Reset the flag on error
        logger.info(
          "Processing flag reset due to error. Will retry processing after delay."
        );
        setTimeout(() => {
          logger.info("Retrying file processing after delay.");
          checkAndProcessNextFile(); // Retry after a 10-second delay
        }, 1000 * config.upload.retryDelaySeconds);
      });
  } else {
    isProcessing = false; // Reset the flag if no file was dequeued
    logger.info("No file was dequeued. Processing flag reset.");
    // If after attempting to dequeue we find the queue empty, set the processing completion flag
    if (fileQueue.length === 0 && !isProcessing) {
      setProcessingCompleteFlag();
      logger.info("All files processed. Processing complete flag set.");
    }
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

module.exports = {
  clearResultsFile,
  enqueueFiles,
  dequeueFile,
  checkAndProcessNextFile,
  resetFileProcessingState, // If you implemented this function
  getTotalFiles,
  getProcessedFiles,
};
