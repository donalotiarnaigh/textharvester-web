const path = require("path");
const { exec } = require("child_process");
const fs = require("fs").promises;
const config = require("../../config.json");
const logger = require("../utils/logger");

async function convertPdfToJpegs(pdfPath) {
  logger.info(`Starting PDF conversion for: ${pdfPath}`);
  const outputPath = config.uploadPath;
  const baseName = path.basename(pdfPath, path.extname(pdfPath));
  const outputPrefix = path.join(outputPath, `${baseName}_page`);
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
      file.startsWith(`${baseName}_page`)
    );

    const fullPaths = outputFiles.map((file) => path.join(outputPath, file));
    logger.info(`JPEG files created at: ${fullPaths.join(", ")}`);

    await fs.unlink(pdfPath);
    logger.info(`Successfully deleted original PDF: ${pdfPath}`);

    return fullPaths;
  } catch (error) {
    logger.error("Error converting PDF to JPEGs:", error);
    throw new Error(`Failed to convert PDF to JPEGs: ${error.message}`);
  }
}

module.exports = convertPdfToJpegs;
