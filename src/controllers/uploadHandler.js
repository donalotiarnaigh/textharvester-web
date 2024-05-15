const multer = require("multer");
const path = require("path");
const config = require("../../config.json");
const { enqueueFiles, clearResultsFile } = require("../utils/fileQueue");
const logger = require("../utils/logger");
const { clearProcessingCompleteFlag } = require("../utils/processingFlag");
const pdfConverter = require("../utils/pdfConverter"); // Adjust the path as necessary

// Function to create a unique name with original filename base and timestamp
function createUniqueName(file) {
  const originalName = path.basename(
    file.originalname,
    path.extname(file.originalname)
  );
  const safeOriginalName = originalName.replace(/[^\w.-]/g, "_");
  const timestamp = Date.now();
  return `${safeOriginalName}_${timestamp}${path.extname(file.originalname)}`;
}

// File filter to include PDF files and other supported types
const fileFilter = (req, file, cb) => {
  if (
    config.supportedFileTypes.includes(file.mimetype) ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadPath); // Make sure this path is correctly configured in your config file
  },
  filename: (req, file, cb) => {
    const uniqueName = createUniqueName(file);
    cb(null, uniqueName);
  },
});

// Configure Multer with the storage, file filter, and limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
}).array("file", config.upload.maxFileCount);

// Function to handle the file upload
const handleFileUpload = (req, res) => {
  logger.info("Handling file upload request"); // Log the upload handling initiation

  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      // Handle specific multer errors (e.g., file too large)
      logger.error("Multer upload error:", err);
      return res
        .status(500)
        .send("An error occurred during the file upload: " + err.message);
    } else if (err) {
      // Handle general errors during the upload process
      logger.error("Unknown upload error:", err);
      return res.status(500).send("Unknown upload error: " + err.message);
    }

    const files = req.files || [];
    logger.info(`Number of files received: ${files.length}`); // Log file count

    if (!files.length) {
      logger.info("No files uploaded."); // Handle no file upload case
      return res.status(400).send("No files uploaded. Please try again.");
    }

    // Filter and log unsupported file types
    const unsupportedFiles = files.filter(
      (file) =>
        !config.supportedFileTypes.includes(file.mimetype) &&
        file.mimetype !== "application/pdf"
    );
    if (unsupportedFiles.length) {
      const unsupportedNames = unsupportedFiles
        .map((file) => file.originalname)
        .join(", ");
      logger.info(`Unsupported file types detected: ${unsupportedNames}`);
      return res
        .status(400)
        .send(`Unsupported file types were uploaded: ${unsupportedNames}`);
    }

    // Collect file processing errors
    const fileErrors = [];

    // Process files based on their type
    try {
      await Promise.all(
        files.map(async (file) => {
          try {
            if (file.mimetype === "application/pdf") {
              // Convert PDFs to JPEGs and enqueue them
              const imagePaths = await pdfConverter(file.path);
              const imageFiles = imagePaths.map((imagePath) => ({
                path: imagePath,
                mimetype: "image/jpeg",
              }));
              enqueueFiles(imageFiles);
            } else {
              // Enqueue non-PDF files directly
              enqueueFiles([file]);
            }
          } catch (conversionError) {
            logger.error(
              `Error converting file ${file.originalname}:`,
              conversionError
            );
            fileErrors.push({
              file: file.originalname,
              error: conversionError.message,
            });
          }
        })
      );

      if (fileErrors.length > 0) {
        res.status(207).json({
          message: "Some files were not processed successfully",
          errors: fileErrors,
        });
      } else {
        clearResultsFile(); // Clear previous results
        clearProcessingCompleteFlag(); // Reset the processing flag
        logger.info("Redirecting to processing page."); // Log the redirection
        res.redirect("/processing.html");
      }
    } catch (error) {
      logger.error("Error processing files:", error);
      res.status(500).send("Failed to process some files. Please try again.");
    }
  });
};

module.exports = {
  handleFileUpload,
  createUniqueName,
};
