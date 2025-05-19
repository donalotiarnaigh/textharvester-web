const logger = require('./logger');

/**
 * Convert JSON data to CSV format
 * @param {Array} jsonData Array of objects to convert
 * @returns {string} CSV formatted string
 */
function jsonToCsv(jsonData) {
  if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
    return '';
  }

  // Define column order with all fields including prompt metadata
  const columns = [
    'memorial_number',
    'first_name',
    'last_name',
    'year_of_death',
    'inscription',
    'file_name',
    'ai_provider',
    'model_version',
    'prompt_version',
    'processed_date'
  ];

  // Create header row
  const headerRow = columns.join(',');

  // Create data rows
  const dataRows = jsonData.map(record => {
    return columns.map(column => {
      let value = record[column];
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return '';
      }
      
      // Convert value to string and handle special characters
      value = String(value);
      
      // Handle newlines
      value = value.replace(/\n/g, '\\n');
      
      // Escape quotes and wrap in quotes if necessary
      if (value.includes(',') || value.includes('"') || value.includes('\\n')) {
        value = value.replace(/"/g, '""');
        return `"${value}"`;
      }
      
      return value;
    }).join(',');
  });

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n') + '\n';
}

/**
 * Format JSON data for export
 * @param {Array} jsonData Array of objects to format
 * @param {string} format Format option ('pretty' or 'compact')
 * @returns {string} Formatted JSON string
 */
function formatJsonForExport(jsonData, format = 'compact') {
  try {
    if (format === 'pretty') {
      return JSON.stringify(jsonData, null, 2);
    }
    return JSON.stringify(jsonData);
  } catch (error) {
    logger.error('Error formatting JSON data:', error);
    return JSON.stringify(jsonData); // Default to compact format on error
  }
}

module.exports = {
  jsonToCsv,
  formatJsonForExport
};
