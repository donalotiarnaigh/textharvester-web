const express = require("express");
const config = require("./config.json");
const { handleFileUpload } = require("./src/controllers/uploadHandler");
const logger = require("./src/utils/logger.js");
const resultsManager = require("./src/controllers/resultsManager");

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

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
