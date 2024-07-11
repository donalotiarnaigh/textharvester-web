/* eslint-disable quotes */
// progressBar.js

// Function to update the progress bar
export function updateProgressBar(percentage) {
  const progressBar = document.getElementById("progressBar");
  progressBar.style.width = percentage + "%";
  progressBar.textContent = `${percentage}%`;
  progressBar.setAttribute("aria-valuenow", percentage);
}

// Function to update the processing message
export function updateProcessingMessage(message) {
  const statusMessage = document.getElementById("statusMessage");
  console.log("Updating processing message to:", message);
  statusMessage.textContent = message;
}
