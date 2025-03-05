/**
 * Converts an array of memorial data objects into a CSV string.
 * Updated to reflect the new structure with first_name, last_name, and year_of_death.
 * @param {Object[]} jsonData - Array of memorial data objects.
 * @return {string} CSV string formatted for memorial data.
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
    'processed_date'
  ];

  // Create CSV header row
  let csv = headers.join(',') + '\n';

  // Add data rows
  jsonData.forEach(record => {
    const row = headers.map(header => {
      const value = record[header] || '';
      // Escape quotes and wrap in quotes if contains comma or newline
      return value.toString().includes(',') || value.toString().includes('\n') || value.toString().includes('"')
        ? `"${value.toString().replace(/"/g, '""')}"` 
        : value;
    });
    csv += row.join(',') + '\n';
  });

  return csv;
}

module.exports = {
  jsonToCsv
};
