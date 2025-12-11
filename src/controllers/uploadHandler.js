/* eslint-disable quotes */
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const config = require("../../config.json");
const { enqueueFiles } = require("../utils/fileQueue");
const logger = require("../utils/logger");
const { clearProcessingCompleteFlag } = require("../utils/processingFlag");
const { convertPdfToJpegs } = require("../utils/pdfConverter");
const { clearAllMemorials } = require('../utils/database');
const { clearAllBurialRegisterEntries } = require('../utils/burialRegisterStorage');
const { getPrompt } = require('../utils/prompts/templates/providerTemplates');
const { promptManager } = require('../utils/prompts/templates/providerTemplates');

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
    const sourceType = req.body?.source_type || req.body?.sourceType;
    const volumeId = req.body?.volume_id || 'vol1';

    let destinationPath = config.uploadPath;

    if (sourceType === 'burial_register') {
      destinationPath = path.join('data', 'burial_register', volumeId);
    }

    if (!fs.existsSync(destinationPath)) {
      fs.mkdirSync(destinationPath, { recursive: true });
      logger.info(`Created upload directory at ${destinationPath}`);
    }

    cb(null, destinationPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = createUniqueName(file);
    cb(null, uniqueName);
  },
});

// In production, we would use multer's actual API:
// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: { fileSize: 100 * 1024 * 1024 }
// }).fields([...]);

// For test compatibility, we use a simpler configuration that matches the test mock
// Increased file size limit to 1GB to support large PDF files (e.g., 210-page burial registers)
const multerConfig = {
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit for large PDFs
};

const validatePromptConfig = async (provider, template, version) => {
  const defaultTemplate = 'memorialOCR';
  const defaultVersion = 'latest';

  const templateName = template || defaultTemplate;
  const templateVersion = version || defaultVersion;

  const promptTemplate = await getPrompt(provider, templateName, templateVersion);
  if (!promptTemplate) {
    throw new Error(`Invalid template: ${templateName}`);
  }

  // Use the provider prompt manager to validate the template
  const validation = promptManager.validatePrompt(promptTemplate, provider);
  if (!validation.isValid) {
    throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
  }

  return {
    template: templateName,
    version: templateVersion,
    config: promptTemplate
  };
};

const handleFileUpload = async (req, res) => {
  const uploadStartTime = Date.now();
  logger.info("Handling file upload request");

  // Log request details for large file debugging
  const contentLength = req.headers['content-length'];
  if (contentLength) {
    const sizeMB = (parseInt(contentLength, 10) / 1024 / 1024).toFixed(2);
    logger.info(`Upload request size: ${sizeMB}MB`);
  }

  const validSourceTypes = ['record_sheet', 'monument_photo', 'burial_register', 'grave_record_card'];

  try {
    const uploadMiddleware = multer(multerConfig).fields([{ name: 'file', maxCount: 10 }]);
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      logger.error("Multer upload error:", err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        logger.error(`File size exceeds limit: ${err.message}`);
        return res
          .status(413)
          .json({ error: `File too large. Maximum file size is 1GB. ${err.message}` });
      }
      return res
        .status(500)
        .json({ error: "An error occurred during the file upload: " + err.message });
    } else {
      logger.error("Unknown upload error:", err);
      return res.status(500).json({ error: "Unknown upload error: " + err.message });
    }
  }

  const shouldReplace = req.body.replaceExisting === 'true';
  const selectedModel = req.body.aiProvider || 'openai';
  let sourceType = req.body.source_type || req.body.sourceType || 'record_sheet';
  const volumeId = req.body.volume_id || 'vol1';

  // Validate and coerce invalid source_type to record_sheet (for backward compatibility)
  if (!validSourceTypes.includes(sourceType)) {
    logger.warn(`Invalid source type received: ${sourceType}, defaulting to record_sheet`);
    sourceType = 'record_sheet';
  }

  const requestedPromptTemplate = req.body.promptTemplate;
  const promptTemplate = sourceType === 'burial_register'
    ? 'burialRegister'
    : requestedPromptTemplate;
  const promptVersion = req.body.promptVersion;

  logger.info(`Replace existing setting: ${shouldReplace}`);
  logger.info(`Selected AI model: ${selectedModel}`);
  logger.info(`Prompt template: ${promptTemplate || 'default'}`);
  logger.info(`Prompt version: ${promptVersion || 'latest'}`);
  logger.info(`Source type: ${sourceType}`);
  if (sourceType === 'burial_register') {
    logger.info(`Volume ID: ${volumeId}`);
  }

  const files = req.files?.file || [];
  logger.info(`Number of files received: ${files.length}`);

  if (!files.length) {
    logger.info("No files uploaded.");
    return res.status(400).send("No files uploaded. Please try again.");
  }

  try {
    // Validate prompt configuration
    let promptConfig;
    try {
      promptConfig = await validatePromptConfig(selectedModel, promptTemplate, promptVersion);
    } catch (error) {
      logger.error("Prompt validation error:", error);
      return res.status(400).json({
        error: error.message
      });
    }

    if (shouldReplace) {
      if (sourceType === 'burial_register') {
        await clearAllBurialRegisterEntries();
        logger.info("Cleared existing burial register entries as requested");
      } else {
        await clearAllMemorials();
        logger.info("Cleared existing memorial records as requested");
      }
    }

    // Collect all files to enqueue in a single batch to preserve sequential processing
    const filesToQueue = [];
    for (const file of files) {
      try {
        if (file.mimetype === "application/pdf") {
          logger.info(`Processing PDF file: ${file.originalname}`);
          const imagePaths = await convertPdfToJpegs(file.path);
          logger.info(`Converted PDF to images: ${imagePaths}`);
          filesToQueue.push(
            ...imagePaths.map((imagePath) => ({
              path: imagePath,
              mimetype: "image/jpeg",
              provider: selectedModel,
              promptVersion: promptConfig.version,
              source_type: sourceType,
              sourceType,
              ...(sourceType === 'burial_register' && { volume_id: volumeId, volumeId }),
              uploadDir: path.dirname(imagePath)
            }))
          );
        } else {
          filesToQueue.push({
            ...file,
            provider: selectedModel,
            promptVersion: promptConfig.version,
            source_type: sourceType,
            sourceType,
            ...(sourceType === 'burial_register' && { volume_id: volumeId, volumeId }),
            uploadDir: path.dirname(file.path)
          });
        }
      } catch (conversionError) {
        logger.error(
          `Error converting file ${file.originalname}:`,
          conversionError
        );
        throw conversionError;
      }
    }

    // Enqueue all files in a single call to maintain sequential processing order
    enqueueFiles(filesToQueue);

    if (sourceType === 'burial_register') {
      logger.info(`Enqueued ${filesToQueue.length} burial register files for processing (volume_id=${volumeId}, provider=${selectedModel})`);
    }

    clearProcessingCompleteFlag();
    const uploadDuration = Date.now() - uploadStartTime;
    logger.info(`Processing complete. Upload took ${uploadDuration}ms. Redirecting to results page.`);

    res.status(200).json({
      message: "File upload complete. Starting conversion...",
      promptConfig: {
        template: promptConfig.template,
        version: promptConfig.version,
        provider: selectedModel
      }
    });
  } catch (error) {
    logger.error("Error handling file upload:", error);
    return res.status(500).json({
      error: "Error processing files"
    });
  }
};

module.exports = {
  handleFileUpload,
};
