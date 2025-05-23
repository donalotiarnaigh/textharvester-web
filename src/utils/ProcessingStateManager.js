/**
 * Manages the state of file processing, including progress tracking and error handling
 */
class ProcessingStateManager {
  constructor() {
    this.state = {
      files: new Map(),
      totalFiles: 0,
      processedFiles: 0,
      errors: new Map(),
      phase: 'idle'
    };
    this.listeners = new Set();
    this.phaseWeights = {
      upload: 0.2,
      ocr: 0.3,
      analysis: 0.3,
      validation: 0.2
    };
  }

  /**
   * Add files to be tracked by the state manager
   * @param {string[]} fileIds Array of file IDs to track
   */
  addFiles(fileIds) {
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
      }
    });
    this._notifyListeners();
  }

  /**
   * Update progress for a specific phase of file processing
   * @param {string} fileId The file identifier
   * @param {string} phase The processing phase
   * @param {number} progress Progress value (0-100)
   * @returns {Promise} Resolves when the update is complete
   */
  async updateFileProgress(fileId, phase, progress) {
    return new Promise((resolve, reject) => {
      // Validate phase
      if (!this.phaseWeights.hasOwnProperty(phase)) {
        reject(new Error('Invalid phase name'));
        return;
      }

      // Validate progress bounds
      if (progress < 0 || progress > 100) {
        reject(new Error('Progress value must be between 0 and 100'));
        return;
      }

      // Get file state
      const file = this.state.files.get(fileId);
      if (!file) {
        reject(new Error('File not found'));
        return;
      }

      // Update atomically
      try {
        file.phases[phase] = progress;
        this._updateProcessedFiles();
        this._notifyListeners();
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Calculate the overall progress across all files
   * @returns {number} Overall progress percentage
   */
  getOverallProgress() {
    if (this.state.totalFiles === 0) return 0;

    const fileProgresses = Array.from(this.state.files.values()).map(file => {
      let weightedProgress = 0;
      for (const [phase, weight] of Object.entries(this.phaseWeights)) {
        weightedProgress += (file.phases[phase] * weight);
      }
      return weightedProgress;
    });

    const totalProgress = fileProgresses.reduce((sum, progress) => sum + progress, 0);
    return totalProgress / this.state.totalFiles;
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
  isComplete() {
    // Check for any errors
    if (this.state.errors.size > 0) return false;

    // Check all files and phases
    for (const file of this.state.files.values()) {
      for (const phase of Object.keys(this.phaseWeights)) {
        if (file.phases[phase] < 100) return false;
      }
    }

    return true;
  }

  /**
   * Private method to update processed files count
   * @private
   */
  _updateProcessedFiles() {
    let processed = 0;
    for (const file of this.state.files.values()) {
      if (Object.values(file.phases).every(progress => progress === 100)) {
        processed++;
      }
    }
    this.state.processedFiles = processed;
  }

  /**
   * Private method to notify all listeners of state changes
   * @private
   */
  _notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

module.exports = { ProcessingStateManager }; 