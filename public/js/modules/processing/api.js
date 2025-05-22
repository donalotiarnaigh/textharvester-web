/* eslint-disable quotes */
// api.js

import { updateProgressBar, updateProcessingMessage } from "./progressBar.js";
import { updateErrorMessages } from "./errorHandler.js";
import { getStatusMessage } from "./modelTracking.js";

/**
 * Fetches the current processing progress from the server
 * @returns {Promise} Promise with progress data
 */
export async function checkProgress() {
  try {
    const response = await fetch('/progress');
    const data = await response.json();
    
    // Get currently selected model
    const selectedModel = localStorage.getItem('selectedModel') || 'openai';
    
    // Update progress bar
    updateProgressBar(data.progress);
    
    // Update error messages if present
    if (data.errors && Array.isArray(data.errors)) {
      updateErrorMessages(data.errors);
    }
    
    // Update file progress text if available
    const fileProgress = document.getElementById('fileProgress');
    if (fileProgress && data.processedFiles !== undefined && data.totalFiles !== undefined) {
      fileProgress.textContent = `Processed ${data.processedFiles} of ${data.totalFiles} files`;
    }
    
    // Update status message based on processing state
    if (data.state === 'complete') {
      updateProcessingMessage(getStatusMessage('complete', selectedModel));
      // Redirect to results page after a short delay
      setTimeout(() => {
        window.location.href = '/results.html';
      }, 1000);
    } else if (data.state === 'error') {
      updateProcessingMessage(getStatusMessage('error', selectedModel));
    } else {
      updateProcessingMessage(getStatusMessage('processing', selectedModel));
    }
    
    return data;
  } catch (error) {
    console.error('Error checking progress:', error);
    throw error;
  }
}
