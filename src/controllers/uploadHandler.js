// uploadHandler.js

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const config = require("../../config.json");
const { enqueueFiles, clearResultsFile } = require("../utils/fileQueue");
const logger = require("../utils/logger");
const { clearProcessingCompleteFlag } = require("../utils/processingFlag");

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.uploadPath);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// The Multer upload fields configuration
const uploadFields = multer({ storage: storage }).fields([
  { name: "file", maxCount: config.upload.maxFileCount },
  { name: "folder", maxCount: config.upload.maxFileCount },
]);

// Function to handle the file upload
const handleFileUpload = (req, res) => {
  uploadFields(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      logger.error("Multer upload error:", err);
      return res.status(500).send("An error occurred during the file upload.");
    } else if (err) {
      // An unknown error occurred when uploading.
      logger.error("Unknown upload error:", err);
      return res.status(500).send("Unknown upload error.");
    }

    // Everything went fine. Process the files.
    const files = [
      ...(req.files.file || []),
      ...(req.files.folder || []),
    ].filter((file) => file.originalname !== ".DS_Store");

    if (files.length === 0) {
      logger.info("No files uploaded.");
      return res.status(400).send("No files uploaded. Please try again.");
    }

    const supportedFileTypes = config.supportedFileTypes;
    const invalidFiles = files.filter(
      (file) => !supportedFileTypes.includes(file.mimetype)
    );

    if (invalidFiles.length > 0) {
      const invalidFileNames = invalidFiles
        .map((file) => file.originalname)
        .join(", ");
      logger.info(`Unsupported file types detected: ${invalidFileNames}`);
      return res
        .status(400)
        .send("Unsupported file types were uploaded. Please try again.");
    }

    // Log the received files
    files.forEach((file, index) =>
      logger.info(`File ${index + 1}: ${file.originalname}`)
    );

    // Add files to the processing queue
    clearResultsFile();
    enqueueFiles(files);
    logger.info(`Enqueued ${files.length} file(s) for processing.`);

    // Clear the flag that indicates processing is complete
    clearProcessingCompleteFlag();

    // Redirect the user to the processing page
    res.redirect("/processing.html");
  });
};

module.exports = {
  handleFileUpload,
};
