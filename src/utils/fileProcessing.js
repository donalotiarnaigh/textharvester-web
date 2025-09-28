const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const { createProvider } = require('./modelProviders');
const { storeMemorial, storeParallelMemorial } = require('./database');
const { getPrompt } = require('./prompts/templates/providerTemplates');
const { isEmptySheetError } = require('./errorTypes');

function resolveProviders(options) {
  if (options.providers && Array.isArray(options.providers) && options.providers.length > 0) {
    return [...new Set(options.providers.map(provider => provider.trim()).filter(Boolean))];
  }

  const provider = options.provider || process.env.AI_PROVIDER || 'openai';
  return [provider];
}

async function processProvider(providerName, base64Image, filePath, promptTemplate, promptVersion, options) {
  let providerInstance;
  let promptInstance;

  try {
    logger.info(`Processing ${filePath} with provider ${providerName}`);
    promptInstance = await Promise.resolve(getPrompt(providerName, promptTemplate, promptVersion));
    const promptConfig = promptInstance.getProviderPrompt(providerName);
    const userPrompt = typeof promptConfig === 'string' ? promptConfig : promptConfig.userPrompt;
    const systemPrompt = typeof promptConfig === 'object' ? promptConfig.systemPrompt : undefined;

    const providerOptions = { ...options };
    delete providerOptions.providers;
    providerInstance = createProvider({
      ...providerOptions,
      AI_PROVIDER: providerName
    });

    const rawExtractedData = await providerInstance.processImage(base64Image, userPrompt, {
      systemPrompt,
      promptTemplate: promptInstance
    });

    logger.debugPayload(`Raw ${providerName} API response for ${filePath}:`, rawExtractedData);

    const extractedData = promptInstance.validateAndConvert(rawExtractedData);
    logger.info(`${providerName} API response processed successfully for ${filePath}`);
    logger.debugPayload(`Processed ${providerName} data for ${filePath}:`, extractedData);

    const enrichedData = {
      ...extractedData,
      fileName: path.basename(filePath),
      ai_provider: providerName,
      model_version: providerInstance.getModelVersion(),
      prompt_template: promptTemplate,
      prompt_version: promptInstance.version
    };

    return {
      provider: providerName,
      status: 'success',
      data: enrichedData,
      rawResponse: rawExtractedData
    };
  } catch (error) {
    if (isEmptySheetError(error)) {
      logger.warn(`Empty sheet detected for ${filePath} via ${providerName}: ${error.message}`);
      return {
        provider: providerName,
        status: 'error',
        errorType: error.type || 'empty_sheet',
        errorMessage: error.message,
        isEmptySheet: true,
        modelVersion: providerInstance ? providerInstance.getModelVersion() : null,
        rawResponse: error.rawResponse
      };
    }

    logger.error(`Error processing provider ${providerName} for ${filePath}:`, error);
    return {
      provider: providerName,
      status: 'error',
      errorMessage: error.message,
      error,
      modelVersion: providerInstance ? providerInstance.getModelVersion() : null
    };
  }
}

async function persistParallelResults(fileName, metadata, providerResults) {
  await storeParallelMemorial(fileName, metadata, providerResults);
}

async function processFile(filePath, options = {}) {
  const providers = resolveProviders(options);
  const promptTemplate = options.promptTemplate || 'memorialOCR';
  const promptVersion = options.promptVersion || 'latest';
  const fileName = path.basename(filePath);
  const isParallel = providers.length > 1;

  logger.info(`Starting to process file: ${filePath} with providers: ${providers.join(', ')}`);

  try {
    const base64Image = await fs.readFile(filePath, { encoding: 'base64' });
    logger.info(`File ${filePath} read successfully. Proceeding with OCR processing.`);

    const providerResultsArray = await Promise.all(
      providers.map((provider) =>
        processProvider(provider, base64Image, filePath, promptTemplate, promptVersion, options)
      )
    );

    const providerResults = providerResultsArray.reduce((acc, result) => {
      acc[result.provider] = result;
      return acc;
    }, {});

    if (isParallel) {
      const firstSuccessful = providerResultsArray.find(result => result.status === 'success');
      const resolvedPromptVersion = firstSuccessful?.data?.prompt_version || promptVersion;

      await persistParallelResults(fileName, {
        promptTemplate,
        promptVersion: resolvedPromptVersion
      }, providerResults);

      await fs.unlink(filePath);
      logger.info(`Cleaned up processed file: ${filePath}`);

      return {
        fileName,
        promptTemplate,
        promptVersion: resolvedPromptVersion,
        providers: providerResults
      };
    }

    const providerName = providers[0];
    const result = providerResults[providerName];

    if (!result) {
      throw new Error(`No result returned for provider ${providerName}`);
    }

    if (result.status === 'success') {
      await storeMemorial(result.data);
      logger.info(`OCR text for ${filePath} stored in database with model: ${providerName}`);
      await fs.unlink(filePath);
      logger.info(`Cleaned up processed file: ${filePath}`);
      return result.data;
    }

    if (result.isEmptySheet) {
      await fs.unlink(filePath);
      logger.info(`Cleaned up empty sheet file: ${filePath}`);
      return {
        fileName,
        error: true,
        errorType: result.errorType || 'empty_sheet',
        errorMessage: result.errorMessage,
        ai_provider: providerName,
        model_version: result.modelVersion || null
      };
    }

    if (result.error) {
      throw result.error;
    }

    throw new Error(result.errorMessage || 'Unknown processing error');
  } catch (error) {
    logger.error(`Error processing file ${filePath}:`, error);
    throw error;
  }
}

module.exports = { processFile };
