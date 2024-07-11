/* eslint-disable quotes */
// main.js

import { initializeClipboard } from "./clipboard.js";
import {
  validateFilenameInput,
  downloadJsonResults,
  downloadCsvResults,
} from "./download.js";
import { getQueryParam } from "./utils.js";
import { fetchResultsData } from "./api.js";

// Function to initialize the page
function initializePage() {
  const jsonDataElement = document.getElementById("jsonData");
  const filenameInput = document.getElementById("filenameInput");

  // Initialize Clipboard.js for copying to clipboard
  initializeClipboard(jsonDataElement);

  // Validate filename input in real-time
  validateFilenameInput(filenameInput);

  // Check cancellation status and update message accordingly
  const status = getQueryParam("status");
  if (status === "cancelled") {
    const infoMessageElement = document.querySelector(".info-message");
    infoMessageElement.textContent =
      "Note: Processing was cancelled and the results may be incomplete.";
    infoMessageElement.style.backgroundColor = "#ffcccc"; // Change color to indicate a warning or cancellation
  }

  // Fetch results data from the server
  fetchResultsData(jsonDataElement);

  // Modify download functions to include the dynamic filename
  window.downloadJsonResults = () => downloadJsonResults(filenameInput);
  window.downloadCsvResults = () => downloadCsvResults(filenameInput);
}

// Event listener for page load
document.addEventListener("DOMContentLoaded", initializePage);
