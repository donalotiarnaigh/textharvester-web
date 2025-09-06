/* eslint-disable quotes */
const multer = require("multer");
const path = require("path");
const config = require("../../config.json");
const { enqueueFiles } = require("../utils/fileQueue");
const logger = require("../utils/logger");
const { clearProcessingCompleteFlag } = require("../utils/processingFlag");
const { convertPdfToJpegs } = require("../utils/pdfConverter");
const { clearAllMemorials } = require('../utils/database');
const { getPrompt } = require('../utils/prompts/templates/providerTemplates');
const { promptManager } = require('../utils/prompts/templates/providerTemplates');
const { getFinalSourceType } = require('../utils/featureFlags');

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

// In production, we would use multer's actual API:
// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: { fileSize: 100 * 1024 * 1024 }
// }).fields([...]);

// For test compatibility, we use a simpler configuration that matches the test mock
const multerConfig = {
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
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
  logger.info("Handling file upload request");

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
      return res
        .status(500)
        .send("An error occurred during the file upload: " + err.message);
    } else {
      logger.error("Unknown upload error:", err);
      return res.status(500).send("Unknown upload error: " + err.message);
    }
  }

  const shouldReplace = req.body.replaceExisting === 'true';
  const selectedModel = req.body.aiProvider || 'openai';
  const promptTemplate = req.body.promptTemplate;
  const promptVersion = req.body.promptVersion;
  const sourceType = req.body.source_type || 'record_sheet';

  // Process source_type with feature flag validation
  const finalSourceType = getFinalSourceType(sourceType);

  logger.info(`Replace existing setting: ${shouldReplace}`);
  logger.info(`Selected AI model: ${selectedModel}`);
  logger.info(`Prompt template: ${promptTemplate || 'default'}`);
  logger.info(`Prompt version: ${promptVersion || 'latest'}`);
  logger.info(`Source type: ${sourceType} → final: ${finalSourceType}`);

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
      await clearAllMemorials();
      logger.info("Cleared existing memorial records as requested");
    }

    // Process files
    for (const file of files) {
      try {
        if (file.mimetype === "application/pdf") {
          logger.info(`Processing PDF file: ${file.originalname}`);
          const imagePaths = await convertPdfToJpegs(file.path);
          logger.info(`Converted PDF to images: ${imagePaths}`);
          await enqueueFiles(
            imagePaths.map((imagePath) => ({
              path: imagePath,
              mimetype: "image/jpeg",
              provider: selectedModel,
              promptTemplate: promptConfig.template,
              promptVersion: promptConfig.version,
              source_type: finalSourceType
            }))
          );
        } else {
          await enqueueFiles([{
            ...file,
            provider: selectedModel,
            promptTemplate: promptConfig.template,
            promptVersion: promptConfig.version,
            source_type: finalSourceType
          }]);
        }
      } catch (conversionError) {
        logger.error(
          `Error converting file ${file.originalname}:`,
          conversionError
        );
        throw conversionError;
      }
    }

    clearProcessingCompleteFlag();
    logger.info("Processing complete. Redirecting to results page.");

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
