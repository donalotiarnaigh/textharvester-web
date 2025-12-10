/* eslint-disable quotes */
/* global Dropzone */

// dropzone.js

import { handleFileUpload } from "./fileUpload.js";
import { initModelSelection } from "./modelSelection.js";
import { initSourceTypeSelection } from "./sourceTypeSelection.js";

// Ensure Dropzone is defined globally
const initDropzone = () => {
  // Initialize UI components
  initSourceTypeSelection();
  initModelSelection();
  
  if (typeof Dropzone === "undefined") {
    console.error(
      "Dropzone is not defined. Make sure Dropzone script is included."
    );
    return;
  }

  Dropzone.options.uploadForm = {
    acceptedFiles: ".jpg, .jpeg, .pdf",
    maxFiles: 100,
    maxFilesize: 1024, // 1GB in MB (matches multer limit)
    autoProcessQueue: false, // Manual processing
    parallelUploads: 100, // Align with backend limit
    dictInvalidFileType: "Only .jpeg, .jpg, and .pdf files are allowed.",
    dictMaxFilesExceeded: "Maximum of 100 files allowed.",
    dictFileTooBig: "File is too big ({{filesize}}MiB). Max filesize: {{maxFilesize}}MiB.",
    init: function () {
      var dropzoneInstance = this;
      handleFileUpload(dropzoneInstance);

      // No need to handle file completion for showing conversion status
    },
  };
};

export { initDropzone };
