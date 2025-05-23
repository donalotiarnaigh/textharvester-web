/**
 * Handles UI updates and progress normalization for the processing status
 */
class ProgressTracker {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.progressBar = document.getElementById('progressBar');
    this.statusMessage = document.getElementById('statusMessage');
    this.phaseIndicator = document.getElementById('phaseIndicator');
    this.lastProgress = 0;

    // Add smooth transition to progress bar
    if (this.progressBar) {
      this.progressBar.style.transition = 'width 0.5s ease-in-out';
    }

    // Phase-specific messages
    this.phaseMessages = {
      upload: 'Uploading files...',
      ocr: 'Performing OCR...',
      analysis: 'Analyzing content...',
      validation: 'Validating results...'
    };

    // Initialize state manager listener
    this.stateManager.addListener(state => this.updateUI(state));
  }

  /**
   * Update the UI based on current state
   * @param {Object} state Current processing state
   */
  updateUI(state) {
    if (!this.progressBar || !this.statusMessage) return;

    // Calculate normalized progress
    const progress = this._normalizeProgress(state);

    // Never show less progress than before
    this.lastProgress = Math.max(this.lastProgress, progress);

    // Update progress bar
    this._updateProgressBar(this.lastProgress);

    // Update phase indicator
    this._updatePhaseIndicator(state.phase);

    // Update status message
    this._updateStatusMessage(state);
  }

  /**
   * Calculate normalized progress from state
   * @param {Object} state Current processing state
   * @returns {number} Normalized progress percentage
   * @private
   */
  _normalizeProgress(state) {
    if (state.totalFiles === 0) return 0;

    const fileProgresses = Array.from(state.files.values()).map(file => {
      let weightedProgress = 0;
      const weights = this.stateManager.phaseWeights;

      for (const [phase, weight] of Object.entries(weights)) {
        weightedProgress += (file.phases[phase] * weight);
      }
      return weightedProgress;
    });

    const totalProgress = fileProgresses.reduce((sum, progress) => sum + progress, 0);
    return Math.min(100, totalProgress / state.totalFiles);
  }

  /**
   * Update the progress bar UI
   * @param {number} progress Progress percentage
   * @private
   */
  _updateProgressBar(progress) {
    // Keep one decimal place for precision
    const percentage = Math.round(progress * 10) / 10;
    this.progressBar.style.width = `${percentage}%`;
    this.progressBar.setAttribute('aria-valuenow', percentage.toString());
  }

  /**
   * Update the phase indicator
   * @param {string} phase Current processing phase
   * @private
   */
  _updatePhaseIndicator(phase) {
    if (!this.phaseIndicator || !phase) return;

    // Special case for OCR
    if (phase.toLowerCase() === 'ocr') {
      this.phaseIndicator.textContent = 'OCR Processing';
      return;
    }

    const phaseDisplay = phase.charAt(0).toUpperCase() + phase.slice(1);
    this.phaseIndicator.textContent = `${phaseDisplay} Processing`;
  }

  /**
   * Update the status message
   * @param {Object} state Current processing state
   * @private
   */
  _updateStatusMessage(state) {
    // Check for errors
    if (state.errors && state.errors.size > 0) {
      this.statusMessage.textContent = `Error processing ${state.errors.size} file(s)`;
      return;
    }

    // Check for completion
    if (state.processedFiles === state.totalFiles && state.totalFiles > 0) {
      this.statusMessage.textContent = 'Processing complete!';
      return;
    }

    // Show phase-specific message
    if (state.phase && this.phaseMessages[state.phase]) {
      this.statusMessage.textContent = this.phaseMessages[state.phase];
      return;
    }

    // Default message
    this.statusMessage.textContent = 'Processing files...';
  }
}

module.exports = { ProgressTracker }; 