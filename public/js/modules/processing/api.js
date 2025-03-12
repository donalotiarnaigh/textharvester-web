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
      console.log('Progress data received:', data); // Add debug logging
      
      // Handle the new progress response format
      if (data.state === "processing") {
        console.log('Processing state detected');
        updateProcessingMessage("Processing files. Please wait...");
        document.getElementById("loading-text").textContent = "Processing files...";
      } else if (data.state === "complete") {
        console.log('Complete state detected');
        updateProcessingMessage("Processing complete. Redirecting to results...");
        document.getElementById("loading-text").textContent = "Complete!";
      } else if (data.state === "waiting") {
        console.log('Waiting state detected');
        updateProcessingMessage("Waiting for files...");
        document.getElementById("loading-text").textContent = "Waiting...";
      }
      
      console.log('Updating progress bar to:', data.progress);
      updateProgressBar(data.progress);
      
      if (data.state === "complete") {
        console.log('Initiating redirect to results page');
        setTimeout(() => {
          window.location.href = "/results.html";
        }, 1000);
      }
    })
    .catch((error) => {
      console.error("Error fetching progress:", error);
    });
}
