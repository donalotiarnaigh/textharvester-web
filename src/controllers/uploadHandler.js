const multer = require("multer");
const path = require("path");
const config = require("../../config.json");
const { enqueueFiles, clearResultsFile } = require("../utils/fileQueue");
const logger = require("../utils/logger");
const { clearProcessingCompleteFlag } = require("../utils/processingFlag");

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    logger.info(`Setting upload destination for file: ${file.originalname}`); // Log destination setting
    cb(null, config.uploadPath); // Directory for storing uploads
  },
  filename: function (req, file, cb) {
    const uniqueName = `${file.fieldname}-${Date.now()}${path.extname(
      file.originalname
    )}`;
    logger.info(
      `Setting filename for file: ${file.originalname} as ${uniqueName}`
    ); // Log filename setting
    cb(null, uniqueName);
  },
});

// Multer configuration to accept multiple files
const upload = multer({ storage: storage }).array(
  "file",
  config.upload.maxFileCount
);

// Function to handle the file upload
const handleFileUpload = (req, res) => {
  logger.info("Handling file upload request"); // Log when the function is called

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // Handle Multer-specific errors
      logger.error("Multer upload error:", err);
      return res.status(500).send("An error occurred during the file upload.");
    } else if (err) {
      // Handle general errors
      logger.error("Unknown upload error:", err);
      return res.status(500).send("Unknown upload error.");
    }

    // Get uploaded files
    const files = req.files || [];
    logger.info(`Number of files received: ${files.length}`); // Log the number of files received

    // If no files are uploaded
    if (files.length === 0) {
      logger.info("No files uploaded.");
      return res.status(400).send("No files uploaded. Please try again.");
    }

    // Check for unsupported file types
    const supportedFileTypes = config.supportedFileTypes;
    const invalidFiles = files.filter(
      (file) => !supportedFileTypes.includes(file.mimetype)
    );

    if (invalidFiles.length > 0) {
      const invalidFileNames = invalidFiles
        .map((file) => file.originalname)
        .join(", ");
      logger.info(`Unsupported file types detected: ${invalidFileNames}`); // Log unsupported file types
      return res
        .status(400)
        .send("Unsupported file types were uploaded. Please try again.");
    }

    // Log received files and add them to the processing queue
    files.forEach((file, index) => {
      logger.info(`File ${index + 1}: ${file.originalname}`); // Log each received file
    });

    clearResultsFile(); // Clear previous results
    enqueueFiles(files); // Add files to the processing queue
    clearProcessingCompleteFlag(); // Reset the processing flag

    // Redirect to the processing page on successful upload
    logger.info("Redirecting to processing page"); // Log redirection
    res.redirect("/processing.html");
  });
};

module.exports = {
  handleFileUpload,
};
