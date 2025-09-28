const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger'); // Adjust the path as needed
const config = require('../../config.json'); // Adjust the path as needed
const { jsonToCsv, formatJsonForExport } = require('../utils/dataConversion'); // Adjust path as needed
const moment = require('moment'); // Ensure moment is installed and imported
const { getTotalFiles, getProcessedFiles, getProcessedResults, getProcessingProgress } = require('../utils/fileQueue.js'); // Adjust the path as needed
const { getAllMemorials, getAllParallelMemorials } = require('../utils/database');
const { validateAndConvertRecords, validateAndConvertTypes } = require('../utils/dataValidation');

function isParallelMode() {
  return process.env.PARALLEL_OCR === 'true';
}

function safeParseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

function mapParallelProvider(row, provider) {
  const baseRecord = validateAndConvertTypes({
    memorial_number: row[`${provider}_memorial_number`],
    first_name: row[`${provider}_first_name`],
    last_name: row[`${provider}_last_name`],
    year_of_death: row[`${provider}_year_of_death`],
    inscription: row[`${provider}_inscription`],
    ai_provider: provider,
    model_version: row[`${provider}_model_version`],
    prompt_version: row.prompt_version
  });

  return {
    ...baseRecord,
    status: row[`${provider}_status`] || (baseRecord.memorial_number !== null ? 'success' : null),
    error_message: row[`${provider}_error_message`] || null,
    raw_response: safeParseJson(row[`${provider}_raw_response`])
  };
}

function mapParallelMemorial(row) {
  return {
    fileName: row.file_name,
    prompt_template: row.prompt_template,
    prompt_version: row.prompt_version,
    processed_date: row.processed_date,
    parallel_status: row.parallel_status,
    openai: mapParallelProvider(row, 'openai'),
    anthropic: mapParallelProvider(row, 'anthropic')
  };
}

function flattenParallelRecord(record) {
  return {
    file_name: record.fileName,
    prompt_template: record.prompt_template,
    prompt_version: record.prompt_version,
    processed_date: record.processed_date,
    parallel_status: record.parallel_status,
    openai_memorial_number: record.openai.memorial_number,
    openai_first_name: record.openai.first_name,
    openai_last_name: record.openai.last_name,
    openai_year_of_death: record.openai.year_of_death,
    openai_inscription: record.openai.inscription,
    openai_model_version: record.openai.model_version,
    openai_status: record.openai.status,
    openai_error_message: record.openai.error_message,
    anthropic_memorial_number: record.anthropic.memorial_number,
    anthropic_first_name: record.anthropic.first_name,
    anthropic_last_name: record.anthropic.last_name,
    anthropic_year_of_death: record.anthropic.year_of_death,
    anthropic_inscription: record.anthropic.inscription,
    anthropic_model_version: record.anthropic.model_version,
    anthropic_status: record.anthropic.status,
    anthropic_error_message: record.anthropic.error_message
  };
}

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

const PARALLEL_CSV_COLUMNS = [
  'file_name',
  'prompt_template',
  'prompt_version',
  'processed_date',
  'parallel_status',
  'openai_memorial_number',
  'openai_first_name',
  'openai_last_name',
  'openai_year_of_death',
  'openai_inscription',
  'openai_model_version',
  'openai_status',
  'openai_error_message',
  'anthropic_memorial_number',
  'anthropic_first_name',
  'anthropic_last_name',
  'anthropic_year_of_death',
  'anthropic_inscription',
  'anthropic_model_version',
  'anthropic_status',
  'anthropic_error_message'
];

async function downloadResultsJSON(req, res) {
  try {
    let jsonPayload;

    if (isParallelMode()) {
      const results = await getAllParallelMemorials();
      jsonPayload = results.map(mapParallelMemorial);
    } else {
      const results = await getAllMemorials();
      const transformedResults = results.map(memorial => ({
        ...memorial,
        fileName: memorial.file_name,
      }));
      jsonPayload = validateAndConvertRecords(transformedResults);
    }

    // Extract filename from query parameters or use a default
    const defaultFilename = `memorials_${moment().format('YYYYMMDD_HHmmss')}.json`;
    const requestedFilename = req.query.filename 
      ? `${sanitizeFilename(req.query.filename)}.json` 
      : defaultFilename;

    // Format JSON based on query parameter
    const format = req.query.format === 'pretty' ? 'pretty' : 'compact';
    const jsonData = formatJsonForExport(jsonPayload, format);

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
    let csvSource;

    if (isParallelMode()) {
      const results = await getAllParallelMemorials();
      const mapped = results.map(mapParallelMemorial).map(flattenParallelRecord);
      csvSource = jsonToCsv(mapped, PARALLEL_CSV_COLUMNS);
    } else {
      const results = await getAllMemorials();
      const transformedResults = results.map(memorial => ({
        ...memorial,
        fileName: memorial.file_name,
      }));
      const validatedResults = validateAndConvertRecords(transformedResults);
      csvSource = jsonToCsv(validatedResults);
    }

    // Generate filename
    const defaultFilename = `memorials_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const requestedFilename = req.query.filename
      ? `${sanitizeFilename(req.query.filename)}.csv`
      : defaultFilename;

    res.setHeader('Content-Disposition', `attachment; filename="${requestedFilename}"`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvSource);
        
    logger.info(`Downloaded CSV results as ${requestedFilename}`);
  } catch (err) {
    logger.error('Error downloading CSV results:', err);
    res.status(500).send('Unable to download results');
  }
}

async function getResults(req, res) {
  try {
    let payload;

    if (isParallelMode()) {
      const dbResults = await getAllParallelMemorials();
      payload = dbResults.map(mapParallelMemorial);
    } else {
      const dbResults = await getAllMemorials();
      const transformedResults = dbResults.map(memorial => ({
        ...memorial,
        fileName: memorial.file_name,
      }));
      payload = validateAndConvertRecords(transformedResults);
    }

    // Get any errors from processed files
    const processedResults = getProcessedResults();
    const errors = processedResults.filter(r => r && r.error);

    // Return both memorials and errors
    res.json({
      memorials: payload,
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
