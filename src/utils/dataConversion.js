/**
 * Converts JSON data to CSV format with proper escaping of special characters
 * @param {Array} jsonData - Array of objects to convert to CSV
 * @returns {string} CSV formatted string
 */
function jsonToCsv(jsonData) {
  if (!jsonData || !jsonData.length) {
    return '';
  }

  // Define headers based on our database structure
  const headers = [
    'memorial_number',
    'first_name',
    'last_name',
    'year_of_death',
    'inscription',
    'file_name',
    'ai_provider',
    'processed_date'
  ];

  // Create CSV header row
  let csv = headers.join(',') + '\n';

  // Add data rows
  jsonData.forEach(record => {
    const row = headers.map(header => {
      let value = record[header] || '';
      value = value.toString();
      
      // Replace actual newlines with \n
      value = value.replace(/\n/g, '\\n');
      
      // Check if we need to quote this field
      const needsQuoting = value.includes(',') || 
                          value.includes('\\n') || 
                          value.includes('"') ||
                          value.includes('\r');
      
      if (needsQuoting) {
        // Double up quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    
    csv += row.join(',') + '\n';
  });

  return csv;
}

module.exports = {
  jsonToCsv
};
