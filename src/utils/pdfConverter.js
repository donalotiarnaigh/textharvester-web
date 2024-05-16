const path = require("path");
const { exec } = require("child_process");
const fs = require("fs").promises;
const config = require("../../config.json");
const logger = require("../utils/logger");

let conversionProgress = 0; // Global variable to track conversion progress

async function convertPdfToJpegs(pdfPath) {
  logger.info(`Starting PDF conversion for: ${pdfPath}`);
  const outputPath = config.uploadPath;
  const originalBaseName = path.basename(pdfPath, path.extname(pdfPath));

  // Truncate the base name to 10 characters for the prefix
  const truncatedBaseName = originalBaseName.slice(0, 10);

  // Create a unique identifier to avoid filename conflicts
  const uniqueIdentifier = Date.now();

  // Generate the output prefix
  const outputPrefix = path.join(
    outputPath,
    `${truncatedBaseName}_${uniqueIdentifier}_page`
  );

  const command = `pdftocairo -jpeg -scale-to 2048 ${pdfPath} ${outputPrefix}`;

  logger.info(`Executing command: ${command}`);

  try {
    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Error converting PDF to JPEGs: ${stderr}`);
          reject(new Error(`Failed to convert PDF to JPEGs: ${stderr}`));
        } else {
          logger.info(`PDF converted to JPEGs: ${stdout}`);
          resolve(stdout);
        }
      });
    });

    const files = await fs.readdir(outputPath);
    const outputFiles = files.filter((file) =>
      file.startsWith(`${truncatedBaseName}_${uniqueIdentifier}_page`)
    );

    const totalFiles = outputFiles.length;
    for (let i = 0; i < totalFiles; i++) {
      // Simulate processing and update conversion progress
      conversionProgress = Math.round(((i + 1) / totalFiles) * 100);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate processing delay
    }

    const fullPaths = outputFiles.map((file) => path.join(outputPath, file));
    logger.info(`JPEG files created at: ${fullPaths.join(", ")}`);

    await fs.unlink(pdfPath);
    logger.info(`Successfully deleted original PDF: ${pdfPath}`);

    conversionProgress = 100; // Ensure progress is set to 100% after completion
    return fullPaths;
  } catch (error) {
    logger.error("Error converting PDF to JPEGs:", error);
    throw new Error(`Failed to convert PDF to JPEGs: ${error.message}`);
  }
}

function getConversionProgress() {
  return conversionProgress;
}

module.exports = {
  convertPdfToJpegs,
  getConversionProgress,
};
