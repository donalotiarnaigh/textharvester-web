import { OpenAIProvider } from './modelProviders/openaiProvider.js';
import { AnthropicProvider } from './modelProviders/anthropicProvider.js';
import logger from './logger.js';
import fs from 'fs';

const providers = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider()
};

export const processFile = async (filePath, aiProvider = 'openai') => {
  try {
    logger.info(`Processing file: ${filePath} with provider: ${aiProvider}`);

    // Read the image file
    const imageBuffer = await fs.promises.readFile(filePath);
    const base64Image = imageBuffer.toString('base64');

    // Get the appropriate provider
    const provider = providers[aiProvider];
    if (!provider) {
      throw new Error(`Invalid AI provider: ${aiProvider}`);
    }

    // Process the image with the selected provider
    const result = await provider.processImage(base64Image);
    logger.info(`Processing complete for: ${filePath}`);

    return result;
  } catch (error) {
    logger.error(`Error processing file ${filePath}:`, error);
    throw error;
  }
};
