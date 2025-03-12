/* eslint-disable quotes */
// progressBar.js

// Function to update the progress bar
export function updateProgressBar(progress) {
  console.log('updateProgressBar called with progress:', progress);
  const progressBar = document.getElementById("progressBar");
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${progress}%`;
    console.log('Progress bar updated to:', progress);
  } else {
    console.error('Progress bar element not found');
  }
}

// Function to update the processing message
export function updateProcessingMessage(message) {
  console.log('updateProcessingMessage called with:', message);
  const statusMessage = document.getElementById("statusMessage");
  if (statusMessage) {
    statusMessage.textContent = message;
    console.log('Status message updated to:', message);
  } else {
    console.error('Status message element not found');
  }
}
