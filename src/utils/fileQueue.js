const fs = require("fs");
const { processFile } = require("./fileProcessing");
const logger = require("./logger");
const config = require("../../config.json");
const path = require("path");

let fileQueue = [];
let isProcessing = false;
let processedFiles = 0;
let totalFiles = 0;
const retryLimits = {}; // Track retry attempts for each file

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

  if (fileQueue.length === 0 && !isProcessing) {
    resetFileProcessingState();
  }

  files.forEach((file, index) => {
    const filePath = file.path ? file.path : file;
    const originalName = file.originalname
      ? file.originalname
      : path.basename(file);
    fileQueue.push(filePath);
    retryLimits[filePath] = retryLimits[filePath] || 0; // Initialize retry count
    logger.info(
      `File ${index + 1} [${originalName}] enqueued. Path: ${filePath}`
    );
  });

  totalFiles += files.length;
  logger.info(
    `Enqueued ${files.length} new file(s). Queue length is now: ${fileQueue.length}. Total files to process: ${totalFiles}`
  );
  checkAndProcessNextFile();
}

function resetFileProcessingState() {
  processedFiles = 0;
  totalFiles = 0;
  logger.info("File processing state reset for a new session.");
}

function dequeueFile() {
  if (fileQueue.length > 0) {
    const nextFilePath = fileQueue.shift();
    retryLimits[nextFilePath] = retryLimits[nextFilePath] || 0;
    logger.info(
      `Dequeued file for processing: ${nextFilePath}. Remaining queue length: ${fileQueue.length}.`
    );
    return nextFilePath;
  }
  logger.info("Queue is empty. No files to dequeue.");
  return null;
}

function enqueueFileForRetry(filePath) {
  if (retryLimits[filePath] < config.maxRetryCount) {
    fileQueue.push(filePath);
    retryLimits[filePath]++;
    logger.info(
      `File re-enqueued for retry: ${filePath}. Retry attempt: ${retryLimits[filePath]}`
    );
  } else {
    logger.error(`File processing failed after maximum retries: ${filePath}`);
    delete retryLimits[filePath];
  }
}

function checkAndProcessNextFile() {
  if (isProcessing) {
    logger.info("Processing is already underway. Exiting check.");
    return;
  }
  if (fileQueue.length === 0) {
    if (!isProcessing) {
      setProcessingCompleteFlag();
    }
    logger.info("No files in the queue to process. Exiting check.");
    return;
  }

  const filePath = dequeueFile();
  if (filePath) {
    isProcessing = true;
    logger.info(
      `Dequeued file for processing: ${filePath}. Initiating processing.`
    );
    processFile(filePath)
      .then(() => {
        logger.info(`File processing completed: ${filePath}.`);
        processedFiles++;
        isProcessing = false;
        checkAndProcessNextFile();
      })
      .catch((error) => {
        logger.error(`Error processing file ${filePath}: ${error}`);
        setTimeout(() => {
          enqueueFileForRetry(filePath);
          isProcessing = false;
          checkAndProcessNextFile();
        }, 1000 * config.upload.retryDelaySeconds);
      });
  } else {
    isProcessing = false;
    if (fileQueue.length === 0) {
      setProcessingCompleteFlag();
    }
  }
}

function setProcessingCompleteFlag() {
  if (Object.keys(retryLimits).length === 0) {
    const flagPath = config.processingCompleteFlagPath;
    try {
      fs.writeFileSync(flagPath, "complete");
      logger.info("Processing completion flag set.");
    } catch (err) {
      logger.error("Error setting processing completion flag:", err);
    }
  }
}

function getTotalFiles() {
  return totalFiles;
}

function getProcessedFiles() {
  return processedFiles;
}

function cancelProcessing() {
  if (!isProcessing) {
    logger.info("No active processing to cancel.");
    return;
  }

  fileQueue.forEach((file) => {
    const filePath = path.join(__dirname, "..", "..", file);
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.error(`Error deleting file ${file}: ${err}`);
      } else {
        logger.info(`Deleted file ${file}`);
      }
    });
  });

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
  cancelProcessing,
};
