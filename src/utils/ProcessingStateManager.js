/**
 * Manages the state of file processing, including progress tracking and error handling
 */
const logger = require('./logger');

class ProcessingStateManager {
  constructor() {
    this.state = {
      files: new Map(),
      totalFiles: 0,
      processedFiles: 0,
      errors: new Map(),
      phase: 'idle',
      processingQueue: new Set(),
      completionState: {
        verificationAttempts: 0,
        lastVerification: null,
        allFilesProcessed: false,
        resultsVerified: false
      }
    };
    this.listeners = new Set();
    this.phaseWeights = {
      upload: 0.2,
      ocr: 0.4,
      analysis: 0.3,
      validation: 0.1
    };
    this._locked = false;
    this._lockQueue = [];

    logger.info('[ProcessingStateManager] Initialized', {
      phaseWeights: this.phaseWeights,
      initialState: {
        totalFiles: this.state.totalFiles,
        processedFiles: this.state.processedFiles,
        phase: this.state.phase
      }
    });
  }

  /**
   * Add files to be tracked by the state manager
   * @param {string[]} fileIds Array of file IDs to track
   */
  async addFiles(fileIds) {
    await this._atomicUpdate(() => {
      const uniqueFiles = [...new Set(fileIds)];
      uniqueFiles.forEach(fileId => {
        if (!this.state.files.has(fileId)) {
          this.state.files.set(fileId, {
            id: fileId,
            phases: {
              upload: 0,
              ocr: 0,
              analysis: 0,
              validation: 0
            },
            errors: [],
            status: 'pending'
          });
          this.state.totalFiles++;
          this.state.processingQueue.add(fileId);
        }
      });
    });
  }

  /**
   * Update progress for a specific phase of file processing
   * @param {string} fileId The file identifier
   * @param {string} phase The processing phase
   * @param {number} progress Progress value (0-100)
   * @returns {Promise} Resolves when the update is complete
   */
  async updateFileProgress(fileId, phase, progress) {
    logger.debug('[ProcessingStateManager] Updating file progress', {
      fileId,
      phase,
      progress,
      currentState: {
        totalFiles: this.state.totalFiles,
        processedFiles: this.state.processedFiles,
        queueSize: this.state.processingQueue.size
      }
    });

    return await this._atomicUpdate(async () => {
      // Validate phase
      if (!this.phaseWeights.hasOwnProperty(phase)) {
        logger.error('[ProcessingStateManager] Invalid phase name', { phase });
        throw new Error('Invalid phase name');
      }

      // Validate progress bounds
      if (progress < 0 || progress > 100) {
        logger.warn('[ProcessingStateManager] Progress value out of bounds', { progress });
        progress = Math.max(0, Math.min(100, progress));
      }

      // Get file state
      const file = this.state.files.get(fileId);
      if (!file) {
        logger.error('[ProcessingStateManager] File not found', { fileId });
        throw new Error('File not found');
      }

      // Update phase progress
      const oldProgress = file.phases[phase];
      file.phases[phase] = progress;

      logger.debug('[ProcessingStateManager] Updated phase progress', {
        fileId,
        phase,
        oldProgress,
        newProgress: progress,
        allPhases: file.phases
      });

      // Check if file is complete
      const isComplete = Object.values(file.phases).every(p => p === 100);
      if (isComplete && file.status !== 'complete') {
        logger.info('[ProcessingStateManager] File processing complete', {
          fileId,
          finalPhases: file.phases
        });
        
        file.status = 'complete';
        this.state.processingQueue.delete(fileId);
        await this._recalculateProcessedFiles();
      }

      // Reset completion verification if any progress changes
      this.state.completionState = {
        verificationAttempts: 0,
        lastVerification: null,
        allFilesProcessed: false,
        resultsVerified: false
      };

      logger.debug('[ProcessingStateManager] Progress update complete', {
        fileId,
        isComplete,
        queueSize: this.state.processingQueue.size,
        processedFiles: this.state.processedFiles,
        totalFiles: this.state.totalFiles
      });
    });
  }

  /**
   * Calculate the overall progress across all files
   * @returns {number} Overall progress percentage
   */
  getOverallProgress() {
    if (this.state.totalFiles === 0) {
      logger.debug('[ProcessingStateManager] No files to process');
      return 0;
    }

    const fileProgresses = Array.from(this.state.files.values()).map(file => {
      let weightedProgress = 0;
      for (const [phase, weight] of Object.entries(this.phaseWeights)) {
        weightedProgress += (file.phases[phase] * weight);
      }
      return weightedProgress;
    });

    const totalProgress = fileProgresses.reduce((sum, progress) => sum + progress, 0);
    const overallProgress = Math.min(100, totalProgress / this.state.totalFiles);

    logger.debug('[ProcessingStateManager] Calculated overall progress', {
      totalFiles: this.state.totalFiles,
      fileProgresses,
      overallProgress
    });

    return overallProgress;
  }

  /**
   * Add an error for a specific file
   * @param {string} fileId The file identifier
   * @param {Error} error The error object
   */
  addError(fileId, error) {
    const file = this.state.files.get(fileId);
    if (file) {
      this.state.errors.set(fileId, error);
      file.status = 'error';
      this._notifyListeners();
    }
  }

  /**
   * Clear error for a specific file
   * @param {string} fileId The file identifier
   */
  clearError(fileId) {
    const file = this.state.files.get(fileId);
    if (file) {
      this.state.errors.delete(fileId);
      file.status = 'pending';
      this._notifyListeners();
    }
  }

  /**
   * Add a state change listener
   * @param {Function} listener Callback function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove a state change listener
   * @param {Function} listener Callback function to remove
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Check if all files are completely processed
   * @returns {boolean} True if all files are complete
   */
  async isComplete() {
    return await this._atomicUpdate(() => {
      // Check for any errors
      if (this.state.errors.size > 0) return false;

      // Check processing queue
      if (this.state.processingQueue.size > 0) return false;

      // Check all files and phases
      for (const file of this.state.files.values()) {
        for (const phase of Object.keys(this.phaseWeights)) {
          if (file.phases[phase] < 100) return false;
        }
      }

      return true;
    });
  }

  /**
   * Perform an atomic state update
   * @private
   */
  async _atomicUpdate(updateFn) {
    await this._acquireLock();
    try {
      const result = await updateFn();
      this._notifyListeners();
      return result;
    } finally {
      this._releaseLock();
    }
  }

  /**
   * Acquire state lock
   * @private
   */
  async _acquireLock() {
    if (this._locked) {
      await new Promise(resolve => this._lockQueue.push(resolve));
    }
    this._locked = true;
  }

  /**
   * Release state lock
   * @private
   */
  _releaseLock() {
    this._locked = false;
    const nextResolver = this._lockQueue.shift();
    if (nextResolver) {
      nextResolver();
    }
  }

  /**
   * Recalculate processed files count
   * @private
   */
  async _recalculateProcessedFiles() {
    const oldProcessedFiles = this.state.processedFiles;
    
    let processed = 0;
    for (const file of this.state.files.values()) {
      if (file.status === 'complete') {
        processed++;
      }
    }
    this.state.processedFiles = processed;

    logger.debug('[ProcessingStateManager] Recalculated processed files', {
      oldCount: oldProcessedFiles,
      newCount: processed,
      totalFiles: this.state.totalFiles
    });

    if (processed === this.state.totalFiles) {
      logger.info('[ProcessingStateManager] All files processed', {
        totalFiles: this.state.totalFiles,
        processedFiles: processed
      });
    }
  }

  /**
   * Notify state change listeners
   * @private
   */
  _notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

module.exports = { ProcessingStateManager }; 