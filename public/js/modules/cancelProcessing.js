/* eslint-disable quotes */
// cancelProcessing.js

import { updateProgressBar, updateProcessingMessage } from "./progressBar.js";

// Flag to indicate if cancellation has started
let isCancelling = false;

// Function to simulate progress to 100%
function simulateProgressTo100(currentProgress) {
  let progress = currentProgress;

  function incrementProgress() {
    if (progress < 100) {
      progress += 10; // Increment progress by 10%
      updateProgressBar(progress);
      updateProcessingMessage("Cancelling... Please wait.");
    } else {
      clearInterval(progressInterval); // Clear the interval once progress reaches 100%
      updateProcessingMessage(
        "Processing cancelled. Redirecting to results..."
      );
      setTimeout(() => {
        window.location.href = "/results.html?status=cancelled";
      }, 1000);
    }
  }

  // Set the interval to increment progress every 10ms
  const progressInterval = setInterval(incrementProgress, 10);
}

// Function to handle cancellation
function handleCancelProcessing() {
  const userConfirmed = confirm(
    "Are you sure you want to cancel? This action will stop all processing, and you may not receive complete results."
  );

  if (userConfirmed) {
    isCancelling = true; // Set the cancelling flag
    fetch("/cancel-processing", {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          console.log("Cancel request successful.");
          updateProcessingMessage(
            "Processing cancelled. Redirecting to results..."
          );
          simulateProgressTo100(
            parseInt(document.getElementById("progressBar").textContent)
          );
        } else {
          console.error(
            "Failed to cancel processing - server responded with an error."
          );
          throw new Error("Failed to cancel processing");
        }
      })
      .catch((error) => {
        console.error("Error during cancellation:", error);
        updateProcessingMessage(
          "Failed to cancel processing, please try again."
        );
        document.getElementById("cancelProcessingButton").disabled = false;
        isCancelling = false; // Reset the cancelling flag on error
      });

    document.getElementById("cancelProcessingButton").disabled = true;
  }
}

// Attach handleCancelProcessing to window to make it accessible globally
window.handleCancelProcessing = handleCancelProcessing;

export { handleCancelProcessing, simulateProgressTo100, isCancelling };
