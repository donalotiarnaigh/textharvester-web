/**
 * Converts an array of memorial data objects into a CSV string.
 * Updated to reflect the new structure with first_name, last_name, and year_of_death.
 * @param {Object[]} jsonData - Array of memorial data objects.
 * @return {string} CSV string formatted for memorial data.
 */
function jsonToCsv(jsonData) {
  // Update the CSV columns to match the new order and include new fields
  const columns = [
    "memorial_number",
    "first_name",
    "last_name",
    "year_of_death",
    "inscription",
  ];

  // Create the header row with the new columns
  let csvString = columns.join(",") + "\n";

  // Iterate through JSON data to build CSV rows matching the new structure
  jsonData.forEach((item) => {
    let row =
      [
        item.memorial_number,
        item.first_name ? `"${item.first_name.replace(/"/g, '""')}"` : "",
        item.last_name ? `"${item.last_name.replace(/"/g, '""')}"` : "",
        item.year_of_death ? `"${item.year_of_death.replace(/"/g, '""')}"` : "",
        item.inscription ? `"${item.inscription.replace(/"/g, '""')}"` : "",
      ].join(",") + "\n";
    csvString += row;
  });

  return csvString;
}

module.exports = { jsonToCsv };
