/* eslint-disable quotes */
// fileUpload.js

import { getSelectedModel } from "./modelSelection.js";

export const handleFileUpload = (dropzoneInstance) => {
  console.log("Dropzone initialized"); // Log initialization

  // Handle manual file submission
  document.getElementById("submitFiles").onclick = function () {
    console.log("Manual file submission triggered."); // Log when submission is triggered
    dropzoneInstance.processQueue(); // Manually trigger file submission
  };

  // Queue monitoring and completion logging
  dropzoneInstance.on("addedfile", function (file) {
    console.log("File added:", file.name); // Log when a file is added to the queue
  });

  dropzoneInstance.on("complete", function (file) {
    console.log("File upload complete:", file.name); // Log when a file upload is complete
  });

  dropzoneInstance.on("queuecomplete", function () {
    console.log(
      "All files have been uploaded. Redirecting to processing.html."
    );
    window.location.href = "/processing.html"; // Redirect when all files are uploaded
  });

  // Error handling with detailed logging
  dropzoneInstance.on("error", function (file, errorMessage) {
    console.error(
      "Error during file upload:",
      file.name,
      "Error:",
      errorMessage
    );
  });

  dropzoneInstance.on("sending", function(file, xhr, formData) {
    const replaceExisting = document.getElementById('replaceExisting').checked;
    const selectedModel = getSelectedModel();
    console.log('Replace existing checked:', replaceExisting); // Debug log
    console.log('Selected model:', selectedModel); // Debug log
    formData.append('replaceExisting', replaceExisting.toString()); // Convert to string
    formData.append('aiProvider', selectedModel);
  });
};
