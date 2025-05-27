/**
 * Verifies completion state of file processing and manages cleanup
 */
class CompletionVerifier {
  constructor(stateManager, storage) {
    this.stateManager = stateManager;
    this.storage = storage;
    this.phaseOrder = ['upload', 'ocr', 'analysis', 'validation'];
    
    // Initialize hook arrays
    this.preValidationHooks = new Set();
    this.postCleanupHooks = new Set();
    this.resultVerificationHooks = new Set();
  }

  /**
   * Add a pre-validation hook
   * @param {Function} hook Hook function that returns Promise<boolean>
   */
  addPreValidationHook(hook) {
    this.preValidationHooks.add(hook);
  }

  /**
   * Remove a pre-validation hook
   * @param {Function} hook Hook function to remove
   */
  removePreValidationHook(hook) {
    this.preValidationHooks.delete(hook);
  }

  /**
   * Add a post-cleanup hook
   * @param {Function} hook Hook function that returns Promise<boolean>
   */
  addPostCleanupHook(hook) {
    this.postCleanupHooks.add(hook);
  }

  /**
   * Remove a post-cleanup hook
   * @param {Function} hook Hook function to remove
   */
  removePostCleanupHook(hook) {
    this.postCleanupHooks.delete(hook);
  }

  /**
   * Add a result verification hook
   * @param {Function} hook Hook function that returns Promise<{isValid: boolean, error?: string}>
   */
  addResultVerificationHook(hook) {
    this.resultVerificationHooks.add(hook);
  }

  /**
   * Remove a result verification hook
   * @param {Function} hook Hook function to remove
   */
  removeResultVerificationHook(hook) {
    this.resultVerificationHooks.delete(hook);
  }

  /**
   * Execute pre-validation hooks
   * @param {string} fileId File identifier
   * @param {Object} context Context object passed to hooks
   * @returns {Promise<{isValid: boolean, error?: string}>}
   * @private
   */
  async _executePreValidationHooks(fileId, context) {
    for (const hook of this.preValidationHooks) {
      const result = await hook(fileId, context);
      if (!result) {
        return {
          isValid: false,
          error: 'Pre-validation hook failed'
        };
      }
    }
    return { isValid: true };
  }

  /**
   * Execute post-cleanup hooks
   * @param {string} fileId File identifier
   * @param {Object} context Context object passed to hooks
   * @returns {Promise<void>}
   * @private
   */
  async _executePostCleanupHooks(fileId, context) {
    for (const hook of this.postCleanupHooks) {
      await hook(fileId, context);
    }
  }

  /**
   * Execute result verification hooks
   * @param {string} fileId File identifier
   * @param {Object} context Context object passed to hooks
   * @returns {Promise<{isValid: boolean, error?: string}>}
   * @private
   */
  async _executeResultVerificationHooks(fileId, context) {
    for (const hook of this.resultVerificationHooks) {
      const result = await hook(fileId, context);
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true };
  }

  /**
   * Verify completion status of a single file
   * @param {string} fileId File identifier
   * @param {Object} options Options for verification
   * @returns {Promise<Object>} Completion status
   */
  async verifyFileCompletion(fileId, options = {}) {
    const file = this.stateManager.state.files.get(fileId);
    if (!file) {
      return {
        isComplete: false,
        message: 'File not found',
        incompletePhases: []
      };
    }

    // Execute pre-validation hooks if not skipped
    if (!options.skipPreValidation) {
      const preValidation = await this._executePreValidationHooks(fileId, { file });
      if (!preValidation.isValid) {
        return {
          isComplete: false,
          hasError: true,
          error: preValidation.error,
          message: `Pre-validation failed: ${preValidation.error}`,
          incompletePhases: []
        };
      }
    }

    // Check for errors
    const error = this.stateManager.state.errors.get(fileId);
    if (error) {
      return {
        isComplete: false,
        hasError: true,
        error,
        message: `Error: ${error.message}`,
        incompletePhases: []
      };
    }

    // Check phase completion
    const incompletePhases = [];
    for (const phase of this.phaseOrder) {
      if (file.phases[phase] < 100) {
        incompletePhases.push(phase);
      }
    }

    return {
      isComplete: incompletePhases.length === 0,
      incompletePhases,
      message: incompletePhases.length > 0 ? 
        `Incomplete phases: ${incompletePhases.join(', ')}` : 
        'All phases complete'
    };
  }

  /**
   * Validate the order of completed phases
   * @param {string} fileId File identifier
   * @returns {Promise<Object>} Validation result
   */
  async validatePhaseOrder(fileId) {
    const file = this.stateManager.state.files.get(fileId);
    if (!file) {
      return {
        isValid: false,
        message: 'File not found'
      };
    }

    let lastCompletePhaseIndex = -1;
    let isValid = true;
    let message = 'Phase order valid';

    for (let i = 0; i < this.phaseOrder.length; i++) {
      const phase = this.phaseOrder[i];
      if (file.phases[phase] === 100) {
        if (i > lastCompletePhaseIndex + 1) {
          isValid = false;
          message = `Invalid phase order: ${this.phaseOrder[lastCompletePhaseIndex + 1]} must complete before ${phase}`;
          break;
        }
        lastCompletePhaseIndex = i;
      }
    }

    return { isValid, message };
  }

  /**
   * Validate phase dependencies
   * @param {string} fileId File identifier
   * @returns {Promise<Object>} Validation result
   */
  async validatePhaseDependencies(fileId) {
    const file = this.stateManager.state.files.get(fileId);
    if (!file) {
      return {
        isValid: false,
        message: 'File not found',
        missingDependencies: []
      };
    }

    const missingDependencies = [];
    for (let i = 0; i < this.phaseOrder.length; i++) {
      const phase = this.phaseOrder[i];
      const nextPhase = this.phaseOrder[i + 1];

      if (nextPhase && file.phases[nextPhase] > 0 && file.phases[phase] < 100) {
        missingDependencies.push(phase);
      }
    }

    return {
      isValid: missingDependencies.length === 0,
      missingDependencies,
      message: missingDependencies.length > 0 ? 
        `Missing dependencies: ${missingDependencies.join(', ')}` : 
        'All dependencies satisfied'
    };
  }

  /**
   * Verify integrity of processed results
   * @param {string} fileId File identifier
   * @returns {Promise<Object>} Verification result
   */
  async verifyResultIntegrity(fileId) {
    // Execute result verification hooks first
    const verificationResult = await this._executeResultVerificationHooks(fileId, {
      file: this.stateManager.state.files.get(fileId)
    });
    if (!verificationResult.isValid) {
      return {
        exists: true,
        isValid: false,
        message: verificationResult.error || 'Result verification failed'
      };
    }

    const processedFile = await this.storage.getProcessedFile(fileId);
    
    if (!processedFile || !processedFile.exists) {
      return {
        exists: false,
        isValid: false,
        message: 'Result file not found'
      };
    }

    if (processedFile.size === 0) {
      return {
        exists: true,
        isValid: false,
        message: 'Empty result file'
      };
    }

    // Validate the result with storage
    const validationResult = await this.storage.validateResults(fileId);
    if (!validationResult.isValid) {
      return {
        exists: true,
        isValid: false,
        message: validationResult.error || 'Result validation failed'
      };
    }

    return {
      exists: true,
      isValid: true,
      message: 'Result file valid'
    };
  }

  /**
   * Clean up temporary processing states
   * @param {string} fileId File identifier
   * @returns {Promise<void>}
   */
  async cleanupTemporaryStates(fileId) {
    const completion = await this.verifyFileCompletion(fileId);
    if (completion.isComplete) {
      // Cleanup first
      await this.storage.cleanupTempFiles(fileId);
      // Then execute post-cleanup hooks
      await this._executePostCleanupHooks(fileId, { completion });
    }
  }

  /**
   * Verify overall completion status
   * @returns {Promise<Object>} Overall completion status
   */
  async verifyCompletion() {
    const validFiles = [];
    const invalidFiles = [];
    const errors = [];
    const validationErrors = [];

    for (const [fileId] of this.stateManager.state.files) {
      // Execute pre-validation hooks first
      const preValidation = await this._executePreValidationHooks(fileId, {
        file: this.stateManager.state.files.get(fileId)
      });
      
      if (!preValidation.isValid) {
        invalidFiles.push(fileId);
        validationErrors.push({
          fileId,
          error: preValidation.error
        });
        continue;
      }

      // Check file completion (skip pre-validation since we just did it)
      const completion = await this.verifyFileCompletion(fileId, { skipPreValidation: true });
      if (!completion.isComplete) {
        invalidFiles.push(fileId);
        if (completion.error) {
          errors.push({ fileId, error: completion.error });
        }
        continue;
      }

      // Validate phase order
      const orderValidation = await this.validatePhaseOrder(fileId);
      if (!orderValidation.isValid) {
        invalidFiles.push(fileId);
        continue;
      }

      // Check result integrity
      const integrity = await this.verifyResultIntegrity(fileId);
      if (!integrity.isValid) {
        invalidFiles.push(fileId);
        continue;
      }

      validFiles.push(fileId);
    }

    const isComplete = invalidFiles.length === 0 && validFiles.length > 0;
    const message = isComplete ? 
      'All files processed successfully' : 
      `${invalidFiles.length} files incomplete or invalid`;

    return {
      isComplete,
      validFiles,
      invalidFiles,
      errors,
      validationErrors,
      message
    };
  }
}

module.exports = { CompletionVerifier }; 