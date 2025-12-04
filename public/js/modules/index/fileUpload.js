/* eslint-disable quotes */
// fileUpload.js

import { getSelectedModel } from "./modelSelection.js";
import { getSelectedSourceType, getVolumeId } from "./sourceTypeSelection.js";

export const handleFileUpload = (dropzoneInstance) => {
  console.log("Dropzone initialized"); // Log initialization

  // Handle manual file submission
  document.getElementById("submitFiles").onclick = function () {
    console.log("Manual file submission triggered."); // Log when submission is triggered
    dropzoneInstance.processQueue(); // Manually trigger file submission
  };


  dropzoneInstance.on("complete", function (file) {
    console.log("File upload complete:", file.name); // Log when a file upload is complete
  });

  dropzoneInstance.on("queuecomplete", function () {
    console.log(
      "All files have been uploaded. Redirecting to processing.html."
    );
    // Only redirect if files were actually uploaded (not just added to queue)
    if (dropzoneInstance.getQueuedFiles().length === 0 && dropzoneInstance.getUploadingFiles().length === 0) {
      window.location.href = "/processing.html"; // Redirect when all files are uploaded
    } else {
      console.warn("Queue complete but files still queued/uploading - not redirecting");
    }
  });

  // Error handling with detailed logging
  dropzoneInstance.on("error", function (file, errorMessage) {
    console.error(
      "Error during file upload:",
      file.name,
      "Error:",
      errorMessage
    );
    // Don't redirect on error - let user see the error
  });

  // Prevent auto-processing when files are added
  dropzoneInstance.on("addedfile", function (file) {
    console.log("File added:", file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB) - Waiting for manual submit`);
    
    // Check file size (1GB limit)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (file.size > maxSize) {
      console.error(`File ${file.name} exceeds 1GB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      dropzoneInstance.removeFile(file);
      alert(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum file size is 1GB.`);
      return;
    }
    
    // Ensure autoProcessQueue is still false
    if (dropzoneInstance.options.autoProcessQueue) {
      console.warn("WARNING: autoProcessQueue is enabled - disabling it");
      dropzoneInstance.options.autoProcessQueue = false;
    }
  });

  dropzoneInstance.on("sending", function (file, xhr, formData) {
    const replaceExisting = document.getElementById('replaceExisting').checked;
    const selectedModel = getSelectedModel();
    const sourceType = getSelectedSourceType();
    const volumeId = getVolumeId();
    console.log('Replace existing checked:', replaceExisting); // Debug log
    console.log('Selected model:', selectedModel); // Debug log
    console.log('Selected source type:', sourceType); // Debug log
    console.log('Volume ID:', volumeId); // Debug log
    formData.append('replaceExisting', replaceExisting.toString()); // Convert to string
    formData.append('aiProvider', selectedModel);
    formData.append('source_type', sourceType);
    if (sourceType === 'burial_register') {
      formData.append('volume_id', volumeId);
    }
  });
};
