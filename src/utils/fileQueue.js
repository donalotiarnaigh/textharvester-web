const fs = require('fs');
const { processFile } = require('./fileProcessing');
const logger = require('./logger');
const config = require('../../config.json');
const path = require('path');
const QueueMonitor = require('./queueMonitor');

const uploadDir = config.uploadPath;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info('Created uploads directory');
}

let fileQueue = [];
let isProcessing = false;
let processedFiles = 0;
let totalFiles = 0;
let processedResults = []; // Store both successful and error results
const retryLimits = {};

// Initialize queue monitor
const queueMonitor = new QueueMonitor();

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
    fileQueue.push({
      path: filePath,
      provider: file.provider || 'openai',
      promptTemplate: file.promptTemplate,
      promptVersion: file.promptVersion,
      source_type: file.source_type || 'record_sheet'
    });
    retryLimits[filePath] = retryLimits[filePath] || 0;
    logger.info(
      `File ${index + 1} [${originalName}] enqueued. Path: ${filePath}, Provider: ${file.provider || 'openai'}`
    );
  });

  totalFiles = files.length;  // Set total files to new batch size
  processedFiles = 0;        // Reset processed files counter
  processedResults = [];     // Clear any previous results
  
  // Record queue metrics
  queueMonitor.recordEnqueue(fileQueue.length);
  
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
  processedResults = [];
  logger.info('File processing state reset for a new session.');
}

function dequeueFile() {
  if (fileQueue.length > 0) {
    const nextFile = fileQueue.shift();
    retryLimits[nextFile.path] = retryLimits[nextFile.path] || 0;
    logger.info(
      `Dequeued file for processing: ${nextFile.path} with provider: ${nextFile.provider}. Remaining queue length: ${fileQueue.length}.`
    );
    return nextFile;
  }
  logger.info('Queue is empty. No files to dequeue.');
  return null;
}

function enqueueFileForRetry(file) {
  if (retryLimits[file.path] < config.maxRetryCount) {
    fileQueue.push(file);
    retryLimits[file.path]++;
    logger.info(
      `File re-enqueued for retry: ${file.path}. Retry attempt: ${retryLimits[file.path]}`
    );
  } else {
    logger.error(`File processing failed after maximum retries: ${file.path}`);
    
    // Add to processed results with error info
    processedResults.push({
      fileName: path.basename(file.path),
      error: true,
      errorType: 'processing_failed',
      errorMessage: `Processing failed after ${config.maxRetryCount} attempts`
    });
    
    processedFiles++; // Count as processed even though it failed
    delete retryLimits[file.path];
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

  const file = dequeueFile();
  if (file) {
    isProcessing = true;
    const processingStartTime = Date.now();
    
    // Record processing start
    queueMonitor.recordProcessingStart(file.path, fileQueue.length);
    
    logger.info(
      `Dequeued file for processing: ${file.path} with provider: ${file.provider}. Initiating processing.`
    );
    processFile(file.path, { 
      provider: file.provider,
      promptTemplate: file.promptTemplate,
      promptVersion: file.promptVersion,
      source_type: file.source_type
    })
      .then((result) => {
        // Store result regardless of success or error
        processedResults.push(result);
        
        const processingTime = Date.now() - processingStartTime;
        const success = !result.error;
        
        // Record processing completion
        queueMonitor.recordProcessingComplete(file.path, processingTime, success, fileQueue.length);
        
        if (result.error) {
          logger.info(`File ${file.path} processed with error: ${result.errorMessage}`);
        } else {
          logger.info(`File processing completed successfully: ${file.path}.`);
        }
        
        processedFiles++;
        isProcessing = false;
        checkAndProcessNextFile();
      })
      .catch((error) => {
        logger.error(`Error processing file ${file.path}: ${error}`);
        setTimeout(() => {
          enqueueFileForRetry(file);
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

function getProcessedResults() {
  return processedResults;
}

function getProcessingProgress() {
  const totalFiles = getTotalFiles();
  const processedFiles = getProcessedFiles();
  
  logger.debug('[FileQueue] Getting processing progress', {
    totalFiles,
    processedFiles
  });

  // Only mark complete if:
  // 1. No files in queue AND
  // 2. Not currently processing AND  
  // 3. All files have been processed
  if (totalFiles === 0 && !isProcessing && processedFiles > 0) {
    logger.info('[FileQueue] All files processed and no active processing, marking as complete');
    return {
      state: 'complete',
      progress: 100
    };
  }
  
  // If there are no files and we haven't processed any, we're waiting
  if (totalFiles === 0) {
    logger.debug('[FileQueue] No files to process, waiting state');
    return {
      state: 'waiting',
      progress: 0
    };
  }

  const progress = Math.round((processedFiles / totalFiles) * 100);
  const errors = processedResults.filter(r => r && r.error);
  
  if (errors.length > 0) {
    logger.warn('[FileQueue] Errors detected during processing', {
      errorCount: errors.length,
      errors: errors.map(e => ({ message: e.error.message }))
    });
  }

  const state = progress === 100 ? 'complete' : 'processing';
  logger.debug('[FileQueue] Progress calculation complete', {
    progress,
    state,
    hasErrors: errors.length > 0
  });

  // Get queue performance metrics
  const queueMetrics = queueMonitor.getPerformanceSummary();
  
  return {
    state,
    progress,
    errors: errors.length > 0 ? errors : undefined,
    queue: {
      size: queueMetrics.current.queueSize,
      throughputPerMinute: queueMetrics.current.throughputPerMinute,
      averageProcessingTime: queueMetrics.current.averageProcessingTime,
      successRate: queueMetrics.current.successRate,
      totalProcessed: queueMetrics.totals.processed,
      totalFailed: queueMetrics.totals.failed
    }
  };
}

function cancelProcessing() {
  if (!isProcessing) {
    logger.info('No active processing to cancel.');
    return;
  }

  fileQueue.forEach((file) => {
    const filePath = path.join(__dirname, '..', '..', file.path);
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.error(`Error deleting file ${file.path}: ${err}`);
      } else {
        logger.info(`Deleted file ${file.path}`);
      }
    });
  });

  fileQueue = [];
  isProcessing = false;
  processedFiles = 0;
  totalFiles = 0;
  processedResults = [];
  logger.info('Processing has been cancelled and the queue has been cleared.');
}

module.exports = {
  enqueueFiles,
  getTotalFiles,
  getProcessedFiles,
  getProcessedResults,
  getProcessingProgress,
  cancelProcessing,
};
