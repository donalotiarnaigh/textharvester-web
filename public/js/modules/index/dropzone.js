/* eslint-disable quotes */
/* global Dropzone */

// dropzone.js

import { handleFileUpload } from "./fileUpload.js";
import { showConversionStatus } from "./conversionStatus.js"; // Import the conversion status module

// Ensure Dropzone is defined globally
const initDropzone = () => {
  if (typeof Dropzone === "undefined") {
    console.error(
      "Dropzone is not defined. Make sure Dropzone script is included."
    );
    return;
  }

  Dropzone.options.uploadForm = {
    acceptedFiles: ".jpg, .jpeg, .pdf",
    maxFiles: 1000,
    autoProcessQueue: false, // Manual processing
    parallelUploads: 1000, // Handle large uploads
    dictInvalidFileType: "Only .jpeg, .jpg, and .pdf files are allowed.",
    dictMaxFilesExceeded: "Maximum of 1,000 files allowed.",
    init: function () {
      var dropzoneInstance = this;
      handleFileUpload(dropzoneInstance);

      // Handle the completion of file upload
      this.on("complete", function (file) {
        if (file.status === Dropzone.SUCCESS) {
          // Show conversion status message and spinner
          showConversionStatus("Upload complete. Converting PDF to JPG...");
        }
      });
    },
  };
};

export { initDropzone };
