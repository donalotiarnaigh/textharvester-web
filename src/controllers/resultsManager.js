const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger'); // Adjust the path as needed
const config = require('../../config.json'); // Adjust the path as needed
const { jsonToCsv } = require('../utils/dataConversion'); // Adjust path as needed
const moment = require('moment'); // Ensure moment is installed and imported
const { getTotalFiles, getProcessedFiles } = require('../utils/fileQueue.js'); // Adjust the path as needed
const { getAllMemorials } = require('../utils/database');

function getProcessingStatus(req, res) {
  const flagPath = path.join(
    __dirname,
    '../../data', // This moves up two levels from src/controllers
    'processing_complete.flag'
  );

  // Use fs.access to check for the existence of the flag file
  fs.access(flagPath, fs.constants.F_OK, (err) => {
    if (!err) {
      // If no error, file exists, proceed to read it
      fs.readFile(flagPath, 'utf8', (readErr, data) => {
        if (readErr) {
          logger.error('Error reading processing complete flag:', readErr);
          return res.status(500).send('Error checking processing status.');
        }
        if (data === 'complete') {
          res.json({ status: 'complete', progress: 100 });
        } else {
          const totalFiles = getTotalFiles();
          const processedFiles = getProcessedFiles();
          let progress =
            totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;
          res.json({ status: 'processing', progress: progress.toFixed(2) });
        }
      });
    } else {
      // If error (meaning file does not exist), consider it still processing
      const totalFiles = getTotalFiles();
      const processedFiles = getProcessedFiles();
      let progress = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;
      res.json({ status: 'processing', progress: progress.toFixed(2) });
    }
  });
}

async function downloadResultsJSON(req, res) {
  try {
    // Get all records from database
    const results = await getAllMemorials();
        
    // Extract filename from query parameters or use a default
    const defaultFilename = `memorials_${moment().format('YYYYMMDD_HHmmss')}.json`;
    const requestedFilename = req.query.filename 
      ? `${sanitizeFilename(req.query.filename)}.json` 
      : defaultFilename;

    res.setHeader('Content-Disposition', `attachment; filename="${requestedFilename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(results);
        
    logger.info(`Downloaded JSON results as ${requestedFilename}`);
  } catch (err) {
    logger.error('Error downloading JSON results:', err);
    res.status(500).send('Unable to download results');
  }
}

// Utility function to sanitize filenames (basic example)
function sanitizeFilename(filename) {
  if (!filename) {
    return '_'; // Default value for null or undefined input
  }

  return filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

async function downloadResultsCSV(req, res) {
  try {
    // Get all records from database
    const results = await getAllMemorials();
        
    // Convert to CSV
    const csvData = jsonToCsv(results);
        
    // Generate filename
    const defaultFilename = `memorials_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const requestedFilename = req.query.filename 
      ? `${sanitizeFilename(req.query.filename)}.csv` 
      : defaultFilename;

    res.setHeader('Content-Disposition', `attachment; filename="${requestedFilename}"`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvData);
        
    logger.info(`Downloaded CSV results as ${requestedFilename}`);
  } catch (err) {
    logger.error('Error downloading CSV results:', err);
    res.status(500).send('Unable to download results');
  }
}

async function getResults(req, res) {
  try {
    const results = await getAllMemorials();
    res.json(results);
  } catch (error) {
    logger.error('Error retrieving results:', error);
    res.status(500).json({ error: 'Failed to retrieve results' });
  }
}

module.exports = {
  getProcessingStatus,
  downloadResultsJSON,
  downloadResultsCSV,
  sanitizeFilename,
  getResults,
};
