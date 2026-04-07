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
const performanceRoutes = require('./src/routes/performanceRoutes');
const graveCardRoutes = require('./src/routes/graveCardRoutes');
const graveCardStorage = require('./src/utils/graveCardStorage');
const llmAuditLog = require('./src/utils/llmAuditLog');
const monumentClassificationStorage = require('./src/utils/monumentClassificationStorage');
const projectStorage = require('./src/utils/projectStorage');
const { validateApiKeys, getProviderStatus, logValidationResults } = require('./src/utils/apiKeyValidator');

// Initialize grave cards table
graveCardStorage.initialize().catch(err => {
  logger.error('Error initializing grave cards table:', err);
});

// Initialize projects table
projectStorage.initialize().catch(err => {
  logger.error('Error initializing projects table:', err);
});

// Initialize LLM audit log table
llmAuditLog.initialize().catch(err => {
  logger.error('Error initializing LLM audit log table:', err);
});

// Initialize monument classifications table
monumentClassificationStorage.initialize().catch(err => {
  logger.error('Error initializing monument classifications table:', err);
});

require('dotenv').config(); // Load environment variables from .env file

// Validate API keys on startup (non-blocking — server starts regardless)
const apiKeyStatus = validateApiKeys();
logValidationResults(apiKeyStatus);

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
// Set timeout to 5 minutes for file upload (multer disk write still needs time)
// PDF conversion is offloaded to background, so no longer blocks response
app.post('/upload', (req, res) => {
  req.setTimeout(5 * 60 * 1000); // 5 minutes
  res.setTimeout(5 * 60 * 1000); // 5 minutes
  handleFileUpload(req, res);
});
app.get('/processing-status', resultsManager.getProcessingStatus);
app.get('/results-data', resultsManager.getResults);
app.get('/download-json', resultsManager.downloadResultsJSON);
app.get('/download-csv', resultsManager.downloadResultsCSV);

// Add the new GET route for progress
app.get('/progress', (req, res) => {
  const progress = getProcessingProgress();
  logger.info('Progress request received. Current progress:', progress);
  res.json(progress);
});

// Add the new POST route for canceling processing
app.post('/cancel-processing', (req, res) => {
  logger.info('Cancel processing request received.');
  cancelProcessing();
  res.send({ status: 'cancelled' });
});

// Grave Card routes
app.use('/api/grave-cards', graveCardRoutes);

// Project Management routes
const projectRoutes = require('./src/routes/projectRoutes');
app.use('/api/projects', projectRoutes);

// Cost Estimate routes
const costEstimateRoutes = require('./src/routes/costEstimateRoutes');
app.use('/api/cost-estimate', costEstimateRoutes);

// Schema Management routes
const apiRoutes = require('./src/routes/api');
app.use('/api/schemas', apiRoutes);

// Result Edit routes (inline correction of results)
const resultEditRoutes = require('./src/routes/resultEditRoutes');
app.use('/api/results', resultEditRoutes);

// Mobile Upload routes (iOS app integration)
const mobileUploadRoutes = require('./src/routes/mobileUploadRoutes');
app.use('/api/mobile', mobileUploadRoutes);

// Provider status endpoint (for frontend to check which providers have keys configured)
app.get('/api/providers/status', (req, res) => {
  res.json({ providers: getProviderStatus() });
});

// Performance monitoring routes
app.use('/api/performance', performanceRoutes);

app.listen(port, async () => {
  logger.info(`Server is running on http://localhost:${port}`);

  if (process.env.NODE_ENV === 'development') {
    // Launch local app in development mode
    await launchLocalApp();
  }
});
