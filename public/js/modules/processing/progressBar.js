/* eslint-disable quotes */
// progressBar.js

/**
 * Updates the progress bar UI with the current progress percentage
 * @param {number} progress - Progress percentage (0-100)
 */
export function updateProgressBar(progress) {
  const progressBar = document.getElementById('progressBar');
  
  if (progressBar) {
    const percentage = Math.round(progress);
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
    progressBar.textContent = `${percentage}%`;
  }
}

/**
 * Updates the processing message displayed to the user
 * @param {string} message - Message to display
 */
export function updateProcessingMessage(message) {
  const statusMessage = document.getElementById('statusMessage');
  
  if (statusMessage && message) {
    statusMessage.textContent = message;
  }
}
