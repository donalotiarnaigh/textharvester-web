/**
 * Updates the error messages display in the UI
 * @param {Array} errors - Array of error objects
 */
export function updateErrorMessages(errors) {
  const errorContainer = document.getElementById('errorContainer');
  const errorList = document.getElementById('errorList');
  
  if (!errorContainer || !errorList) {
    console.error('Error container or error list element not found');
    return;
  }
  
  // Clear previous errors
  errorList.innerHTML = '';
  
  // Skip if no errors or errors is empty
  if (!errors || errors.length === 0) {
    errorContainer.style.display = 'none';
    return;
  }
  
  // Show container
  errorContainer.style.display = 'block';
  
  // Add each error message
  errors.forEach(err => {
    const errorItem = document.createElement('div');
    errorItem.className = 'error-item';
    
    let message = `<strong>File:</strong> ${err.fileName} - `;
    
    // Format message based on error type
    switch(err.errorType) {
      case 'empty_sheet':
        message += "This sheet appears to be empty or unreadable. Processing was skipped for this page.";
        break;
      case 'processing_failed':
        message += "Processing failed after multiple attempts. Please check the image quality.";
        break;
      case 'validation':
        message += `Validation error: ${err.errorMessage}`;
        break;
      default:
        message += err.errorMessage || "An unknown error occurred";
    }
    
    errorItem.innerHTML = message;
    errorList.appendChild(errorItem);
  });
} 