/* eslint-disable quotes */
/* global Dropzone */

// dropzone.js

import { handleFileUpload } from "./fileUpload.js";

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
    },
  };
};

export { initDropzone };
