/**
 * Converts an array of memorial data objects into a CSV string.
 * Specific to the structure of memorial data with predefined columns.
 * @param {Object[]} jsonData - Array of memorial data objects.
 * @return {string} CSV string formatted for memorial data.
 */
function jsonToCsv(jsonData) {
  // Define CSV columns
  const columns = ["number", "memorial_number", "inscription"];
  // Create the header row
  let csvString = columns.join(",") + "\n";

  // Iterate through JSON data to build CSV rows
  jsonData.forEach((item, index) => {
    let row = `${index + 1},${item.memorial_number},"${
      item.inscription ? item.inscription.replace(/"/g, '""') : ""
    }"\n`;
    csvString += row;
  });

  return csvString;
}

module.exports = { jsonToCsv };
