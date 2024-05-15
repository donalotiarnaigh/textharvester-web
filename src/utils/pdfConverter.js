const path = require("path");
const poppler = require("pdf-poppler");
const fs = require("fs").promises; // Using promises version for better async handling
const config = require("../../config.json"); // Adjust path as necessary to import config
const logger = require("../utils/logger");

async function convertPdfToJpegs(pdfPath) {
  const outputPath = config.uploadPath; // Use uploadPath from config for output
  const baseName = path.basename(pdfPath, path.extname(pdfPath));
  const options = {
    format: "jpeg",
    out_dir: outputPath, // Specify output directory from config
    out_prefix: baseName + "_page",
    page: null, // Convert all pages
    scale: 2048,
    strip: true,
    timeout: 30000,
  };

  try {
    const outputFiles = await poppler.convert(pdfPath, options);
    const fullPaths = outputFiles.map((fileName) =>
      path.join(outputPath, fileName)
    );

    // Log full paths of created JPEGs
    logger.info(
      `PDF converted to JPEGs, files created at: ${fullPaths.join(", ")}`
    );

    // Delete the original PDF file after successful conversion
    await fs.unlink(pdfPath);
    logger.info(`Successfully deleted original PDF: ${pdfPath}`);

    return fullPaths;
  } catch (error) {
    logger.error("Error converting PDF to JPEGs:", error);
    throw new Error(`Failed to convert PDF to JPEGs: ${error.message}`);
  }
}

module.exports = convertPdfToJpegs;
