/**
 * Convert JSON data to CSV format
 * @param {Array} jsonData Array of objects to convert
 * @returns {string} CSV formatted string
 */
function jsonToCsv(jsonData) {
  if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
    return '';
  }

  // Define column order
  const columns = [
    'memorial_number',
    'first_name',
    'last_name',
    'year_of_death',
    'inscription',
    'file_name',
    'processed_date',
    'ai_provider',
    'model_version'
  ];

  // Create header row
  const headerRow = columns.join(',');

  // Create data rows
  const dataRows = jsonData.map(record => {
    return columns.map(column => {
      let value = record[column] || '';
      
      // Convert value to string and handle newlines
      value = String(value).replace(/\n/g, '\\n');
      
      // Escape special characters
      if (value.includes(',') || value.includes('"') || value.includes('\\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  // Combine header and data rows with consistent line endings
  return dataRows.reduce((csv, row) => csv + row + '\n', headerRow + '\n');
}

module.exports = {
  jsonToCsv
};
