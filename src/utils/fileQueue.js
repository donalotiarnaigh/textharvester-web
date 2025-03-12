const fs = require('fs');
const { processFile } = require('./fileProcessing');
const logger = require('./logger');
const config = require('../../config.json');
const path = require('path');

const uploadDir = config.uploadPath;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info('Created uploads directory');
}

let fileQueue = [];
let isProcessing = false;
let processedFiles = 0;
let totalFiles = 0;
const retryLimits = {};

function enqueueFiles(files) {
  logger.info(`Enqueue operation started at ${new Date().toISOString()}`);

  // Reset processing state at the start of a new batch
  resetFileProcessingState();
  isProcessing = false;  // Ensure processing flag is reset
  fileQueue = [];       // Clear any existing queue

  files.forEach((file, index) => {
    const filePath = typeof file === 'string' ? file : file.path;
    const originalName = file.originalname
      ? file.originalname
      : path.basename(filePath);
    fileQueue.push(filePath);
    retryLimits[filePath] = retryLimits[filePath] || 0;
    logger.info(
      `File ${index + 1} [${originalName}] enqueued. Path: ${filePath}`
    );
  });

  totalFiles = files.length;  // Set total files to new batch size
  processedFiles = 0;        // Reset processed files counter
  
  logger.info(
    `Enqueued ${files.length} new file(s). Queue length is now: ${fileQueue.length}. Total files to process: ${totalFiles}`
  );
  checkAndProcessNextFile();
}

function resetFileProcessingState() {
  processedFiles = 0;
  totalFiles = 0;
  isProcessing = false;
  fileQueue = [];
  logger.info('File processing state reset for a new session.');
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
  logger.info('Queue is empty. No files to dequeue.');
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
    logger.info('Processing is already underway. Exiting check.');
    return;
  }
  if (fileQueue.length === 0) {
    if (!isProcessing) {
      setProcessingCompleteFlag();
    }
    logger.info('No files in the queue to process. Exiting check.');
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
      fs.writeFileSync(flagPath, 'complete');
      logger.info('Processing completion flag set.');
    } catch (err) {
      logger.error('Error setting processing completion flag:', err);
    }
  }
}

function getTotalFiles() {
  return totalFiles;
}

function getProcessedFiles() {
  return processedFiles;
}

function getProcessingProgress() {
  const totalFiles = getTotalFiles();
  const processedFiles = getProcessedFiles();
  
  // If there are no files at all and we've processed some files previously,
  // return 100% to trigger redirect
  if (totalFiles === 0 && processedFiles > 0) {
    return {
      state: 'complete',
      progress: 100
    };
  }
  
  // If there are no files and we haven't processed any, we're waiting
  if (totalFiles === 0) {
    return {
      state: 'waiting',
      progress: 0
    };
  }

  const progress = Math.round((processedFiles / totalFiles) * 100);
  return {
    state: progress === 100 ? 'complete' : 'processing',
    progress: progress
  };
}

function cancelProcessing() {
  if (!isProcessing) {
    logger.info('No active processing to cancel.');
    return;
  }

  fileQueue.forEach((file) => {
    const filePath = path.join(__dirname, '..', '..', file);
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
  logger.info('Processing has been cancelled and the queue has been cleared.');
}

module.exports = {
  enqueueFiles,
  dequeueFile,
  checkAndProcessNextFile,
  resetFileProcessingState,
  getTotalFiles,
  getProcessedFiles,
  getProcessingProgress,
  cancelProcessing,
};
