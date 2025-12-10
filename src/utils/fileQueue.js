const fs = require('fs');
const { processFile } = require('./fileProcessing');
const logger = require('./logger');
const config = require('../../config.json');
const path = require('path');
const QueueMonitor = require('./queueMonitor');

const maxConcurrent = parseInt(
  process.env.UPLOAD_MAX_CONCURRENT || config.upload.maxConcurrent || 3,
  10
);

const uploadDir = config.uploadPath;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info('Created uploads directory');
}

let fileQueue = [];
let activeWorkers = 0;
let processedFiles = 0;
let totalFiles = 0;
let processedResults = []; // Store both successful and error results
const retryLimits = {};

// Initialize queue monitor
const queueMonitor = new QueueMonitor();
logger.info(`File queue initialized with maxConcurrent: ${maxConcurrent}`);

function enqueueFiles(files) {
  logger.info(`Enqueue operation started at ${new Date().toISOString()}`);

  // If no processing is currently happening and the queue is empty,
  // we can safely reset the counters for a fresh batch
  if (fileQueue.length === 0 && activeWorkers === 0) {
    resetFileProcessingState();
  }

  // Detect if all files are burial_register type
  const allBurialRegister = files.every(file => {
    const sourceType = file.source_type || file.sourceType;
    return sourceType === 'burial_register';
  });
  const volumeId = allBurialRegister && files.length > 0 
    ? (files[0].volume_id || files[0].volumeId) 
    : null;

  if (allBurialRegister && volumeId) {
    logger.info(`Enqueuing ${files.length} burial register files (volume_id=${volumeId})`);
  }

  files.forEach((file, index) => {
    const filePath = typeof file === 'string' ? file : file.path;
    const originalName = file.originalname
      ? file.originalname
      : path.basename(filePath);
    const sourceType = file.source_type || file.sourceType;
    fileQueue.push({
      path: filePath,
      provider: file.provider || 'openai',
      promptTemplate: file.promptTemplate,
      promptVersion: file.promptVersion,
      sourceType: file.sourceType || file.source_type || 'record_sheet',
      source_type: file.sourceType || file.source_type || 'record_sheet',
      ...(file.volume_id && { volume_id: file.volume_id, volumeId: file.volumeId || file.volume_id })
    });
    retryLimits[filePath] = retryLimits[filePath] || 0;
    const logContext = sourceType === 'burial_register' && file.volume_id
      ? `, Source: ${sourceType}, Volume: ${file.volume_id}`
      : '';
    logger.info(
      `File ${index + 1} [${originalName}] enqueued. Path: ${filePath}, Provider: ${file.provider || 'openai'}${logContext}`
    );
  });

  // Accumulate totals instead of resetting so multiple enqueue
  // calls can build up a single processing queue
  totalFiles += files.length;
  
  // Record queue metrics
  queueMonitor.recordEnqueue(fileQueue.length);

  logger.info(
    `Enqueued ${files.length} new file(s). Queue length is now: ${fileQueue.length}. Active workers: ${activeWorkers}. Total files to process: ${totalFiles}`
  );
  checkAndProcessNextFile();
}

function resetFileProcessingState() {
  processedFiles = 0;
  totalFiles = 0;
  activeWorkers = 0;
  fileQueue = [];
  processedResults = [];
  logger.info('File processing state reset for a new session.');
}

function dequeueFile() {
  if (fileQueue.length > 0) {
    const nextFile = fileQueue.shift();
    retryLimits[nextFile.path] = retryLimits[nextFile.path] || 0;
    logger.info(
      `Dequeued file for processing: ${nextFile.path} with provider: ${nextFile.provider}. Remaining queue length: ${fileQueue.length}. Active workers: ${activeWorkers}.`
    );
    return nextFile;
  }
  logger.info('Queue is empty. No files to dequeue.');
  return null;
}

function enqueueFileForRetry(file) {
  const maxRetryCount = config.upload?.maxRetryCount || 3;
  if (retryLimits[file.path] < maxRetryCount) {
    fileQueue.push(file);
    retryLimits[file.path]++;
    logger.info(
      `File re-enqueued for retry: ${file.path}. Retry attempt: ${retryLimits[file.path]}. Queue length: ${fileQueue.length}`
    );
  } else {
    logger.error(`File processing failed after maximum retries: ${file.path}`);
    
    // Add to processed results with error info
    processedResults.push({
      fileName: path.basename(file.path),
      error: true,
      errorType: 'processing_failed',
      errorMessage: `Processing failed after ${maxRetryCount} attempts`
    });
    
    processedFiles++; // Count as processed even though it failed
    delete retryLimits[file.path];
  }
}

function checkAndProcessNextFile() {
  if (fileQueue.length === 0) {
    if (activeWorkers === 0) {
      logger.info('No files in the queue and no active workers. Processing complete.');
      setProcessingCompleteFlag();
    } else {
      logger.info(`No files in the queue to process. Active workers: ${activeWorkers}`);
    }
    return;
  }

  while (activeWorkers < maxConcurrent && fileQueue.length > 0) {
    const file = dequeueFile();
    if (!file) break;

    activeWorkers++;
    const processingStartTime = Date.now();

    // Record processing start
    queueMonitor.recordProcessingStart(file.path, fileQueue.length);

    const sourceType = file.sourceType || file.source_type || 'unknown';
    const volumeId = file.volume_id || file.volumeId;
    const sourceContext = sourceType === 'burial_register' && volumeId
      ? `, source_type: ${sourceType}, volume_id: ${volumeId}`
      : sourceType !== 'unknown' ? `, source_type: ${sourceType}` : '';
    logger.info(
      `Started processing: ${file.path} with provider: ${file.provider}${sourceContext}. Active workers: ${activeWorkers}, Queue length: ${fileQueue.length}`
    );

    const processingOptions = {
      provider: file.provider,
      promptTemplate: file.promptTemplate,
      promptVersion: file.promptVersion,
      sourceType: file.sourceType || file.source_type,
      source_type: file.sourceType || file.source_type,
      ...(file.volume_id && { volume_id: file.volume_id, volumeId: file.volumeId || file.volume_id })
    };

    processFile(file.path, processingOptions)
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
      })
      .catch((error) => {
        logger.error(`Error processing file ${file.path}: ${error}`);
        setTimeout(() => {
          enqueueFileForRetry(file);
          logger.info(
            `Retry scheduled for ${file.path}. Queue length: ${fileQueue.length}. Active workers: ${activeWorkers}`
          );
          checkAndProcessNextFile();
        }, 1000 * config.upload.retryDelaySeconds);
      })
      .finally(() => {
        activeWorkers--;
        logger.info(
          `Worker finished for ${file.path}. Active workers: ${activeWorkers}. Queue length: ${fileQueue.length}`
        );
        if (fileQueue.length === 0 && activeWorkers === 0) {
          setProcessingCompleteFlag();
        } else {
          checkAndProcessNextFile();
        }
      });
  }
}

function setProcessingCompleteFlag() {
  if (fileQueue.length === 0 && activeWorkers === 0 && Object.keys(retryLimits).length === 0) {
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
  // 2. No active workers AND
  // 3. All files have been processed
  if (totalFiles === 0 && activeWorkers === 0 && processedFiles > 0) {
    logger.info('[FileQueue] All files processed and no active workers, marking as complete');
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
  
  // Collect conflict warnings from successful results
  const conflictWarnings = [];
  processedResults.forEach(result => {
    if (result && !result.error && result.conflicts && result.conflicts.length > 0) {
      result.conflicts.forEach(conflict => {
        if (conflict.status === 'resolved') {
          conflictWarnings.push({
            fileName: conflict.file_name,
            errorType: 'page_number_conflict',
            errorMessage: `Page number conflict resolved: AI extracted page ${conflict.original_page_number} but filename suggests page ${conflict.resolved_page_number}. Using filename-based page number.`,
            conflicts: [conflict]
          });
        } else if (conflict.status === 'failed') {
          conflictWarnings.push({
            fileName: conflict.file_name,
            errorType: 'page_number_conflict',
            errorMessage: `Page number conflict unresolved: AI extracted page ${conflict.original_page_number} but entry already exists. Filename does not match expected pattern.`,
            conflicts: [conflict]
          });
        }
      });
    }
  });
  
  // Combine errors and conflict warnings
  const allWarnings = [...errors, ...conflictWarnings];
  
  if (errors.length > 0) {
    logger.warn('[FileQueue] Errors detected during processing', {
      errorCount: errors.length,
      errors: errors.map(e => ({
        fileName: e.fileName,
        errorType: e.errorType,
        message: e.errorMessage
      }))
    });
  }
  
  if (conflictWarnings.length > 0) {
    logger.info('[FileQueue] Page number conflicts detected and resolved', {
      conflictCount: conflictWarnings.length,
      conflicts: conflictWarnings.map(c => ({ fileName: c.fileName, status: c.conflicts[0].status }))
    });
  }

  // Only mark complete if progress is 100% AND no active workers
  const state = (progress === 100 && activeWorkers === 0) ? 'complete' : 'processing';
  logger.debug('[FileQueue] Progress calculation complete', {
    progress,
    state,
    hasErrors: errors.length > 0,
    hasConflicts: conflictWarnings.length > 0
  });

  // Get queue performance metrics
  const queueMetrics = queueMonitor.getPerformanceSummary();
  
  return {
    state,
    progress,
    errors: allWarnings.length > 0 ? allWarnings : undefined,
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
  if (activeWorkers === 0) {
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
  activeWorkers = 0;
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
