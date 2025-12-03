const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger'); // Adjust the path as needed
const config = require('../../config.json'); // Adjust the path as needed
const { jsonToCsv, formatJsonForExport } = require('../utils/dataConversion'); // Adjust path as needed
const moment = require('moment'); // Ensure moment is installed and imported
const { getTotalFiles, getProcessedFiles, getProcessedResults, getProcessingProgress } = require('../utils/fileQueue.js'); // Adjust the path as needed
const { getAllMemorials, db } = require('../utils/database');
const { getAllBurialRegisterEntries } = require('../utils/burialRegisterStorage');
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

/**
 * Detect which source type has the most recent data by comparing processed_date
 * @returns {Promise<string>} Returns 'burial_register' or 'memorial' (defaults to 'memorial')
 */
async function detectSourceType() {
  return new Promise((resolve) => {
    try {
      // Query both tables for most recent processed_date
      db.get('SELECT MAX(processed_date) as max_date FROM memorials', [], (err, memorialResult) => {
        if (err) {
          logger.error('Error querying memorials for source type detection:', err);
          resolve('memorial'); // Default on error
          return;
        }

        db.get('SELECT MAX(processed_date) as max_date FROM burial_register_entries', [], (err2, burialResult) => {
          if (err2) {
            logger.error('Error querying burial_register_entries for source type detection:', err2);
            resolve('memorial'); // Default on error
            return;
          }

          const memorialDate = memorialResult?.max_date ? new Date(memorialResult.max_date) : null;
          const burialDate = burialResult?.max_date ? new Date(burialResult.max_date) : null;

          // If both are null/empty, default to memorial
          if (!memorialDate && !burialDate) {
            resolve('memorial');
            return;
          }

          // If only one has data, return that type
          if (!memorialDate) {
            resolve('burial_register');
            return;
          }
          if (!burialDate) {
            resolve('memorial');
            return;
          }

          // Compare dates - return the one with more recent data
          if (burialDate > memorialDate) {
            resolve('burial_register');
          } else {
            resolve('memorial');
          }
        });
      });
    } catch (error) {
      logger.error('Error in detectSourceType:', error);
      resolve('memorial'); // Default on error
    }
  });
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
    // Detect which source type has the most recent data
    const sourceType = await detectSourceType();
    
    // Get any errors from processed files
    const processedResults = getProcessedResults();
    const errors = processedResults.filter(r => r && r.error);
    
    if (sourceType === 'burial_register') {
      // Get burial register entries
      const dbResults = await getAllBurialRegisterEntries();
      
      // Transform database field names to match frontend expectations
      const transformedResults = dbResults.map(entry => ({
        ...entry,
        fileName: entry.file_name, // Map file_name to fileName for frontend compatibility
      }));
      
      // Return burial register entries with source type
      res.json({
        burialRegisterEntries: transformedResults,
        sourceType: 'burial_register',
        errors: errors
      });
    } else {
      // Get memorials (default)
      const dbResults = await getAllMemorials();
      
      // Transform database field names to match frontend expectations
      const transformedResults = dbResults.map(memorial => ({
        ...memorial,
        fileName: memorial.file_name, // Map file_name to fileName for frontend compatibility
      }));
      
      // Validate and convert data types
      const validatedResults = validateAndConvertRecords(transformedResults);
      
      // Return memorials with source type
      res.json({
        memorials: validatedResults,
        sourceType: 'memorial',
        errors: errors
      });
    }
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
