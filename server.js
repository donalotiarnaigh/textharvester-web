const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser'); // Add cookie parser middleware
const config = require('./config.json');
const { handleFileUpload } = require('./src/controllers/uploadHandler');
const logger = require('./src/utils/logger.js');
const resultsManager = require('./src/controllers/resultsManager');
const {
  cancelProcessing,
  getProcessingProgress,
} = require('./src/utils/fileQueue');
require('dotenv').config(); // Load environment variables from .env file
const authMiddleware = require('./src/middlewares/authMiddleware'); // Import JWT middleware

const app = express();
const port = process.env.PORT || config.port;

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(cookieParser()); // Use cookie parser middleware

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || config.mongoURI;

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

app.use(express.static('public'));

// Require the authentication routes
const authRoutes = require('./src/routes/authRoutes');

// Use the authentication routes
app.use('/api/auth', authRoutes);

// Use the modular functions for routes
app.post('/upload', authMiddleware, handleFileUpload); // Protected route
app.get(
  '/processing-status',
  authMiddleware,
  resultsManager.getProcessingStatus
); // Protected route
app.get('/results-data', authMiddleware, resultsManager.getResultsData); // Protected route
app.get('/download-json', authMiddleware, resultsManager.downloadResultsJSON); // Protected route
app.get('/download-csv', authMiddleware, resultsManager.downloadResultsCSV); // Protected route

// Add the new GET route for progress
app.get('/progress', authMiddleware, (req, res) => {
  // Protected route
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
app.post('/cancel-processing', authMiddleware, (req, res) => {
  // Protected route
  logger.info('Cancel processing request received.');
  cancelProcessing();
  res.send({ status: 'cancelled' });
});

// Example of a protected route
app.get('/protected-route', authMiddleware, (req, res) => {
  res.send('This is a protected route');
});

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
