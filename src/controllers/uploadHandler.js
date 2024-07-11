/* eslint-disable quotes */
const multer = require("multer");
const path = require("path");
const config = require("../../config.json");
const { enqueueFiles, clearResultsFile } = require("../utils/fileQueue");
const logger = require("../utils/logger");
const { clearProcessingCompleteFlag } = require("../utils/processingFlag");
const { convertPdfToJpegs } = require("../utils/pdfConverter");

function createUniqueName(file) {
  const originalName = path.basename(
    file.originalname,
    path.extname(file.originalname)
  );
  const safeOriginalName = originalName.replace(/[^\w.-]/g, "_");
  const timestamp = Date.now();
  return `${safeOriginalName}_${timestamp}${path.extname(file.originalname)}`;
}

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = createUniqueName(file);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
}).array("file", config.upload.maxFileCount);

const handleFileUpload = (req, res) => {
  logger.info("Handling file upload request");

  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      logger.error("Multer upload error:", err);
      return res
        .status(500)
        .send("An error occurred during the file upload: " + err.message);
    } else if (err) {
      logger.error("Unknown upload error:", err);
      return res.status(500).send("Unknown upload error: " + err.message);
    }

    const files = req.files || [];
    logger.info(`Number of files received: ${files.length}`);

    if (!files.length) {
      logger.info("No files uploaded.");
      return res.status(400).send("No files uploaded. Please try again.");
    }

    // Log immediate response to the client
    logger.info("File upload complete. Starting conversion...");

    // Respond immediately to the client
    res.status(200).json({
      message: "File upload complete. Starting conversion...",
    });

    // Process files for conversion in the background
    processFiles(files);
  });
};

const processFiles = async (files) => {
  const fileErrors = [];

  try {
    await Promise.all(
      files.map(async (file) => {
        try {
          if (file.mimetype === "application/pdf") {
            logger.info(`Processing PDF file: ${file.originalname}`);
            const imagePaths = await convertPdfToJpegs(file.path);
            logger.info(`Converted PDF to images: ${imagePaths}`);
            enqueueFiles(
              imagePaths.map((imagePath) => ({
                path: imagePath,
                mimetype: "image/jpeg",
              }))
            );
          } else {
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
      logger.error("Some files were not processed successfully", fileErrors);
    } else {
      clearResultsFile();
      clearProcessingCompleteFlag();
      logger.info("Processing complete. Redirecting to results page.");
    }
  } catch (error) {
    logger.error("Error processing files:", error);
  }
};

module.exports = {
  handleFileUpload,
  createUniqueName,
};
