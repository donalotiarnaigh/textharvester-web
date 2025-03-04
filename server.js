const express = require('express');
const config = require('./config.json');
const { handleFileUpload } = require('./src/controllers/uploadHandler');
const logger = require('./src/utils/logger.js');
const resultsManager = require('./src/controllers/resultsManager');
const { launchLocalApp } = require('./src/utils/localLauncher');
const {
  cancelProcessing,
  getProcessingProgress,
} = require('./src/utils/fileQueue');

require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || config.port;

// Enhanced middleware setup for local development
app.use(express.static('public'));
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// Use the modular functions for routes
app.post('/upload', handleFileUpload);
app.get('/processing-status', resultsManager.getProcessingStatus);
app.get('/results-data', resultsManager.getResultsData);
app.get('/download-json', resultsManager.downloadResultsJSON);
app.get('/download-csv', resultsManager.downloadResultsCSV);

// Add the new GET route for progress
app.get('/progress', (req, res) => {
  const processingProgress = getProcessingProgress();

  let state = 'preparing';
  let progress = 0;

  if (processingProgress > 0) {
    state = 'processing';
    progress = processingProgress;
  }

  res.json({ state, progress });
});

// Add the new POST route for canceling processing
app.post('/cancel-processing', (req, res) => {
  logger.info('Cancel processing request received.');
  cancelProcessing();
  res.send({ status: 'cancelled' });
});

app.listen(port, async () => {
  logger.info(`Server is running on http://localhost:${port}`);
  
  if (process.env.NODE_ENV === 'development') {
    // Launch local app in development mode
    await launchLocalApp();
  }
});
