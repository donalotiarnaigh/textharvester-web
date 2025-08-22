const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger'); // Adjust the path as needed
const config = require('../../config.json'); // Adjust the path as needed
const { jsonToCsv, formatJsonForExport } = require('../utils/dataConversion'); // Adjust path as needed
const moment = require('moment'); // Ensure moment is installed and imported
const { getTotalFiles, getProcessedFiles, getProcessedResults, getProcessingProgress } = require('../utils/fileQueue.js'); // Adjust the path as needed
const { getAllMemorials } = require('../utils/database');
const { validateAndConvertRecords } = require('../utils/dataValidation');

function getProcessingStatus(req, res) {
  // Use the same logic as getProcessingProgress for consistency
  const progressData = getProcessingProgress();
  
  // Get any errors from processed files
  const processedResults = getProcessedResults();
  const errors = processedResults.filter(r => r && r.error);
  
  // Return the full progress data including queue metrics for performance widget
  res.json({
    status: progressData.state,
    progress: progressData.progress,
    errors: errors.length > 0 ? errors : undefined,
    queue: progressData.queue, // Include queue data for performance widget
    files: progressData.files  // Include files data for compatibility
  });
}

async function downloadResultsJSON(req, res) {
  try {
    // Get all successful records from database
    const results = await getAllMemorials();
    
    // Transform database field names to match frontend expectations
    const transformedResults = results.map(memorial => ({
      ...memorial,
      fileName: memorial.file_name, // Map file_name to fileName for frontend compatibility
    }));
    
    // Validate and convert data types
    const validatedResults = validateAndConvertRecords(transformedResults);
        
    // Extract filename from query parameters or use a default
    const defaultFilename = `memorials_${moment().format('YYYYMMDD_HHmmss')}.json`;
    const requestedFilename = req.query.filename 
      ? `${sanitizeFilename(req.query.filename)}.json` 
      : defaultFilename;

    // Format JSON based on query parameter
    const format = req.query.format === 'pretty' ? 'pretty' : 'compact';
    const jsonData = formatJsonForExport(validatedResults, format);

    res.setHeader('Content-Disposition', `attachment; filename="${requestedFilename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(jsonData);
        
    logger.info(`Downloaded JSON results as ${requestedFilename} (${format} format)`);
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
    // Get all successful records from database
    const results = await getAllMemorials();
    
    // Transform database field names to match frontend expectations
    const transformedResults = results.map(memorial => ({
      ...memorial,
      fileName: memorial.file_name, // Map file_name to fileName for frontend compatibility
    }));
    
    // Validate and convert data types
    const validatedResults = validateAndConvertRecords(transformedResults);
        
    // Convert to CSV
    const csvData = jsonToCsv(validatedResults);
        
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
    // Get all successful records from database
    const dbResults = await getAllMemorials();
    
    // Transform database field names to match frontend expectations
    const transformedResults = dbResults.map(memorial => ({
      ...memorial,
      fileName: memorial.file_name, // Map file_name to fileName for frontend compatibility
      // Keep the original file_name for backward compatibility if needed
    }));
    
    // Validate and convert data types
    const validatedResults = validateAndConvertRecords(transformedResults);
    
    // Get any errors from processed files
    const processedResults = getProcessedResults();
    const errors = processedResults.filter(r => r && r.error);
    
    // Return both memorials and errors
    res.json({
      memorials: validatedResults,
      errors: errors
    });
  } catch (error) {
    logger.error('Error retrieving results:', error);
    res.status(500).json({ error: 'Failed to retrieve results' });
  }
}

module.exports = {
  getProcessingStatus,
  downloadResultsJSON,
  downloadResultsCSV,
  getResults,
};
