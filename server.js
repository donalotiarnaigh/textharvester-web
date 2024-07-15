/* eslint-disable quotes */
const express = require("express");
const mongoose = require("mongoose");
const config = require("./config.json");
const { handleFileUpload } = require("./src/controllers/uploadHandler");
const logger = require("./src/utils/logger.js");
const resultsManager = require("./src/controllers/resultsManager");
const {
  cancelProcessing,
  getProcessingProgress,
} = require("./src/utils/fileQueue");
require("dotenv").config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || config.port;

// Middleware to parse JSON request bodies
app.use(express.json());

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || config.mongoURI;

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

app.use(express.static("public"));

// Require the authentication routes
const authRoutes = require("./src/routes/authRoutes");

// Use the authentication routes
app.use("/api/auth", authRoutes);

// Use the modular functions for routes
app.post("/upload", handleFileUpload);
app.get("/processing-status", resultsManager.getProcessingStatus);
app.get("/results-data", resultsManager.getResultsData);
app.get("/download-json", resultsManager.downloadResultsJSON);
app.get("/download-csv", resultsManager.downloadResultsCSV);

// Add the new GET route for progress
app.get("/progress", (req, res) => {
  const processingProgress = getProcessingProgress();

  let state = "preparing";
  let progress = 0;

  if (processingProgress > 0) {
    state = "processing";
    progress = processingProgress;
  }

  res.json({ state, progress });
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
