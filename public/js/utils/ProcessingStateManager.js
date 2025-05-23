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
          status: 'pending'
        });
      }
    });
    this.state.totalFiles = this.state.files.size;
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
    const file = this.state.files.get(fileId);
    if (!file) return;

    file.status = 'error';
    this.state.errors.set(fileId, error);
    this._notifyListeners();
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
   * @param {Function} listener Callback function
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
      totalFiles: 0,
      processedFiles: 0,
      errors: new Map(),
      phase: 'idle'
    };
    this._notifyListeners();
  }
}

module.exports = { ProcessingStateManager }; 