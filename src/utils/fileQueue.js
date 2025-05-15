import fs from 'fs';
import path from 'path';
import { processFile } from './fileProcessing.js';
import { storeMemorial } from './database.js';
import logger from './logger.js';

const queueFile = path.join(process.cwd(), 'data', 'queue.json');

// Ensure the data directory exists
if (!fs.existsSync(path.dirname(queueFile))) {
  fs.mkdirSync(path.dirname(queueFile), { recursive: true });
}

// Initialize queue if it doesn't exist
if (!fs.existsSync(queueFile)) {
  fs.writeFileSync(queueFile, JSON.stringify([]));
}

export const addToQueue = (fileInfo) => {
  const queue = JSON.parse(fs.readFileSync(queueFile));
  queue.push({
    ...fileInfo,
    status: 'pending',
    addedAt: new Date().toISOString()
  });
  fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2));
  logger.info(`Added file to queue: ${fileInfo.filePath}`);
};

export const processQueue = async () => {
  const queue = JSON.parse(fs.readFileSync(queueFile));
  const pendingFiles = queue.filter(file => file.status === 'pending');

  for (const file of pendingFiles) {
    try {
      logger.info(`Processing file from queue: ${file.filePath}`);
      
      // Process the file with the selected AI provider
      const result = await processFile(file.filePath, file.aiProvider);
      
      // Add filename to the result
      result.fileName = path.basename(file.filePath);
      
      // Store the result
      await storeMemorial(result);
      
      // Update file status
      file.status = 'completed';
      file.completedAt = new Date().toISOString();
      
      // Clean up the processed file
      await fs.promises.unlink(file.filePath);
      logger.info(`Processed and removed file: ${file.filePath}`);
    } catch (error) {
      logger.error(`Error processing file ${file.filePath}:`, error);
      file.status = 'failed';
      file.error = error.message;
    }
  }

  // Update queue file
  fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2));
};
