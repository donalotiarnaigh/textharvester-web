/* eslint-disable quotes */
const multer = require("multer");
const path = require("path");
const config = require("../../config.json");
const { enqueueFiles } = require("../utils/fileQueue");
const logger = require("../utils/logger");
const { clearProcessingCompleteFlag } = require("../utils/processingFlag");
const { convertPdfToJpegs } = require("../utils/pdfConverter");
const { clearAllMemorials } = require('../utils/database');

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
}).fields([
  { name: 'file', maxCount: config.upload.maxFileCount },
  { name: 'replaceExisting' },
  { name: 'aiProvider' }
]);

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

    const shouldReplace = req.body.replaceExisting === 'true';
    const selectedModel = req.body.aiProvider || 'openai';
    logger.info(`Replace existing setting: ${shouldReplace}`);
    logger.info(`Selected AI model: ${selectedModel}`);

    const files = req.files?.file || [];
    logger.info(`Number of files received: ${files.length}`);

    if (!files.length) {
      logger.info("No files uploaded.");
      return res.status(400).send("No files uploaded. Please try again.");
    }

    try {
      if (shouldReplace) {
        await clearAllMemorials();
        logger.info("Cleared existing memorial records as requested");
      }

      res.status(200).json({
        message: "File upload complete. Starting conversion...",
      });

      processFiles(files, selectedModel);
    } catch (error) {
      logger.error("Error handling file upload:", error);
    }
  });
};

const processFiles = async (files, selectedModel) => {
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
                provider: selectedModel
              }))
            );
          } else {
            enqueueFiles([{
              ...file,
              provider: selectedModel
            }]);
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
