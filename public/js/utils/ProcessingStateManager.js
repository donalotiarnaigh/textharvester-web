/**
 * Manages processing state for files and error tracking
 */
class ProcessingStateManager {
  constructor() {
    this.state = {
      files: new Map(),
      errors: new Map(),
      totalFiles: 0,
      processedFiles: 0,
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
   * Add files to be processed
   * @param {Array<string>} fileIds Array of file IDs
   */
  addFiles(fileIds) {
    fileIds.forEach(fileId => {
      this.state.files.set(fileId, {
        id: fileId,
        status: 'pending',
        phases: {
          upload: 0,
          ocr: 0,
          analysis: 0,
          validation: 0
        },
        retryAttempts: {}
      });
    });
    this.state.totalFiles += fileIds.length;
    this._notifyListeners();
  }

  /**
   * Update progress for a specific file and phase
   * @param {string} fileId File identifier
   * @param {string} phase Processing phase
   * @param {number} progress Progress percentage (0-100)
   */
  updateProgress(fileId, phase, progress) {
    const file = this.state.files.get(fileId);
    if (!file) return;

    // Validate progress bounds
    progress = Math.max(0, Math.min(100, progress));

    // Update phase progress
    file.phases[phase] = progress;

    // Check if file is complete
    const isComplete = Object.values(file.phases).every(p => p === 100);
    if (isComplete) {
      file.status = 'complete';
      this.state.processedFiles++;
    }

    this._notifyListeners();
  }

  /**
   * Set the current processing phase
   * @param {string} phase Current phase
   */
  setPhase(phase) {
    if (this.phaseWeights.hasOwnProperty(phase)) {
      this.state.phase = phase;
      this._notifyListeners();
    }
  }

  /**
   * Record an error for a file
   * @param {string} fileId File identifier
   * @param {Error} error Error object
   */
  recordError(fileId, error) {
    const fileState = this.state.files.get(fileId);
    if (fileState) {
      fileState.status = 'error';
      this.state.errors.set(fileId, error);
      this._notifyListeners();
    }
  }

  /**
   * Add a state change listener
   * @param {Function} listener Listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove a state change listener
   * @param {Function} listener Listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   * @private
   */
  _notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Reset the state manager
   */
  reset() {
    this.state = {
      files: new Map(),
      errors: new Map(),
      totalFiles: 0,
      processedFiles: 0,
      phase: 'idle'
    };
    this._notifyListeners();
  }
}

module.exports = { ProcessingStateManager }; 