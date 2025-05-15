/* eslint-disable quotes */
const multer = require("multer");
const path = require("path");
const config = require("../../config.json");
const { enqueueFiles } = require("../utils/fileQueue");
const logger = require("../utils/logger");
const { clearProcessingCompleteFlag } = require("../utils/processingFlag");
const { convertPdfToJpegs } = require("../utils/pdfConverter");
const { clearAllMemorials } = require('../utils/database');
const { processFile } = require('../utils/fileProcessing.js');
const { addToQueue } = require('../utils/fileQueue.js');
const { createUniqueName } = require('../utils/fileUtils.js');
const fs = require('fs');

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
  { name: 'replaceExisting' }
]);

const handleFileUpload = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const replaceExisting = req.body.replaceExisting === 'true';
    const aiProvider = req.body.aiProvider || 'openai'; // Default to OpenAI if not specified

    logger.info(`File upload request received: ${file.name}`);
    logger.info(`Replace existing: ${replaceExisting}`);
    logger.info(`AI Provider: ${aiProvider}`);

    // Create unique filename
    const uniqueName = createUniqueName(file.name);
    const uploadPath = path.join(process.cwd(), 'uploads', uniqueName);

    // Move file to uploads directory
    await file.mv(uploadPath);
    logger.info(`File saved to: ${uploadPath}`);

    // Add to processing queue
    addToQueue({
      filePath: uploadPath,
      originalName: file.name,
      replaceExisting,
      aiProvider
    });

    res.json({
      message: 'File uploaded successfully',
      filename: uniqueName
    });
  } catch (error) {
    logger.error('Error in handleFileUpload:', error);
    res.status(500).json({ error: 'Error uploading file' });
  }
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
