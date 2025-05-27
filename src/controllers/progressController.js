/**
 * Progress Controller for handling processing state and completion
 */

let stateManager = null;

const progressController = {
  /**
   * Initialize controller with state manager
   * @param {ProcessingStateManager} manager State manager instance
   */
  init(manager) {
    stateManager = manager;
  },

  /**
   * Get current progress state
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  async getProgress(req, res) {
    try {
      // Convert Map to plain object for files
      const filesObj = {};
      for (const [fileId, file] of stateManager.state.files) {
        filesObj[fileId] = {
          phases: { ...file.phases }
        };
      }

      res.json({
        files: filesObj,
        totalFiles: stateManager.state.totalFiles,
        processedFiles: stateManager.state.processedFiles,
        phase: stateManager.state.phase
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get progress'
      });
    }
  },

  /**
   * Verify processing completion
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  async verifyCompletion(req, res) {
    try {
      const result = await stateManager.completionVerifier.verifyCompletion();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to verify completion'
      });
    }
  },

  /**
   * Cleanup completed processing
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  async cleanupProcessing(req, res) {
    try {
      const cleanedFiles = [];
      for (const [fileId] of stateManager.state.files) {
        try {
          const completion = await stateManager.completionVerifier.verifyFileCompletion(fileId);
          if (completion.isComplete) {
            await stateManager.completionVerifier.cleanupTemporaryStates(fileId);
            cleanedFiles.push(fileId);
          }
        } catch (fileError) {
          // Log file-specific error but continue with other files
          console.error(`Error cleaning up file ${fileId}:`, fileError);
        }
      }

      // If no files were cleaned up, consider it a failure
      if (cleanedFiles.length === 0) {
        throw new Error('No files were cleaned up');
      }

      res.json({
        success: true,
        cleanedFiles
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to cleanup processing'
      });
    }
  }
};

module.exports = { progressController }; 