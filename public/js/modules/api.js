/* eslint-disable quotes */
// api.js

import { updateProgressBar, updateProcessingMessage } from "./progressBar.js";
import { isCancelling } from "./cancelProcessing.js";

// Function to check progress
export function checkProgress() {
  if (isCancelling) return; // Skip progress check if cancelling

  fetch("/progress")
    .then((response) => response.json())
    .then((data) => {
      if (data.state === "processing") {
        updateProcessingMessage("Processing files. Please wait...");
        document.getElementById("loading-text").textContent =
          "Processing files...";
      }
      updateProgressBar(data.progress);
      if (data.progress === 100) {
        setTimeout(() => {
          window.location.href = "/results.html";
        }, 1000);
      }
    })
    .catch((error) => {
      console.error("Error fetching progress:", error);
    });
}
