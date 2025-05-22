/**
 * Custom error class for OCR and text processing errors
 * Extends the standard Error class with additional properties for error type and file path
 */
class ProcessingError extends Error {
  /**
   * Create a new ProcessingError
   * @param {string} message - Error message
   * @param {string} [type] - Error type identifier (e.g., 'empty_sheet', 'validation', 'network', etc.)
   * @param {string} [filePath] - Path to the file that caused the error
   */
  constructor(message, type, filePath) {
    super(message);
    this.name = 'ProcessingError';
    this.type = type;
    this.filePath = filePath;
  }
}

/**
 * Check if an error indicates an empty or unreadable sheet
 * @param {Error} error - The error to check
 * @returns {boolean} - True if the error indicates an empty sheet
 */
function isEmptySheetError(error) {
  // Check for ProcessingError with empty_sheet type
  if (error instanceof ProcessingError && error.type === 'empty_sheet') {
    return true;
  }
  
  // Check for error messages that suggest empty sheets
  if (error.message) {
    const lowerMessage = error.message.toLowerCase();
    return lowerMessage.includes('no readable text found') || 
           lowerMessage.includes('empty data received') || 
           lowerMessage.includes('sheet may be empty') ||
           lowerMessage.includes('sheet is empty');
  }
  
  return false;
}

/**
 * Check if an error is related to validation issues
 * @param {Error} error - The error to check
 * @returns {boolean} - True if the error is related to validation
 */
function isValidationError(error) {
  if (error instanceof ProcessingError && error.type === 'validation') {
    return true;
  }
  
  return false;
}

module.exports = {
  ProcessingError,
  isEmptySheetError,
  isValidationError
}; 