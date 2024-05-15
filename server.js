const express = require("express");
const config = require("./config.json");
const { handleFileUpload } = require("./src/controllers/uploadHandler");
const logger = require("./src/utils/logger.js");
const resultsManager = require("./src/controllers/resultsManager");
const {
  cancelProcessing,
  getProcessingProgress,
} = require("./src/utils/fileQueue");
const { getConversionProgress } = require("./src/utils/pdfConverter"); // Correctly import the function

require("dotenv").config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || config.port;

app.use(express.static("public"));

// Use the modular functions for routes
app.post("/upload", handleFileUpload);
app.get("/processing-status", resultsManager.getProcessingStatus);
app.get("/results-data", resultsManager.getResultsData);
app.get("/download-json", resultsManager.downloadResultsJSON);
app.get("/download-csv", resultsManager.downloadResultsCSV);

// Add the new GET route for combined progress
app.get("/progress", (req, res) => {
  const conversionProgress = getConversionProgress();
  const processingProgress = getProcessingProgress();

  // Combine progress: 50% weight to each stage
  const combinedProgress = Math.round(
    (conversionProgress + processingProgress) / 2
  );

  res.json({ progress: combinedProgress });
});

// Add the new POST route for canceling processing
app.post("/cancel-processing", (req, res) => {
  logger.info("Cancel processing request received.");
  cancelProcessing();
  res.send({ status: "cancelled" });
});

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
