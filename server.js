const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const moment = require("moment");
const config = require("./config.json");
const { handleFileUpload } = require("./src/controllers/uploadHandler");
const logger = require("./src/utils/logger.js");
const { jsonToCsv } = require("./src/utils/dataConversion");

require("dotenv").config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || config.port;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.uploadPath);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Define a global queue to hold file paths
let fileQueue = [];
let totalFiles = 0;
let processedFiles = 0;

app.use(express.static("public"));

app.post("/upload", handleFileUpload);

app.get("/processing-status", (req, res) => {
  const flagPath = path.join(__dirname, "data", "processing_complete.flag");

  // Check if the processing complete flag file exists
  fs.exists(flagPath, (exists) => {
    if (exists) {
      // Read the content of the flag file
      fs.readFile(flagPath, "utf8", (err, data) => {
        if (err) {
          console.error("Error reading processing complete flag:", err);
          return res.status(500).send("Error checking processing status.");
        }
        // Check if the flag file indicates completion
        if (data === "complete") {
          res.json({ status: "complete", progress: 100 });
        } else {
          // If file content is not as expected, treat as still processing
          let progress =
            totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;
          res.json({ status: "processing", progress: progress.toFixed(2) });
        }
      });
    } else {
      // If flag file doesn't exist, treat as still processing
      let progress = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;
      res.json({ status: "processing", progress: progress.toFixed(2) });
    }
  });
});

app.get("/results-data", (req, res) => {
  const resultsPath = config.resultsPath;

  try {
    const data = fs.readFileSync(resultsPath, "utf8");
    logger.info("Sending results data.");
    res.json(JSON.parse(data));
  } catch (err) {
    logger.error("Error reading results file:", err);
    res.status(500).send("Unable to retrieve results.");
  }
});

app.get("/download-json", (req, res) => {
  const resultsPath = config.resultsPath;

  try {
    res.setHeader("Content-Disposition", "attachment; filename=results.json");
    res.setHeader("Content-Type", "application/json");
    res.sendFile(path.join(__dirname, resultsPath));
  } catch (err) {
    logger.error("Error reading results file:", err);
    res.status(500).send("Unable to retrieve results.");
  }
});

app.get("/download-csv", (req, res) => {
  const resultsPath = config.resultsPath;

  fs.readFile(path.join(__dirname, resultsPath), "utf8", (err, data) => {
    if (err) {
      logger.error("Error reading results file:", err);
      return res.status(500).send("Unable to retrieve results.");
    }

    const jsonData = JSON.parse(data);
    const csvData = jsonToCsv(jsonData); // Convert JSON to CSV

    const dateStr = moment().format("YYYYMMDD_HHmmss");
    const filename = `hgth_${dateStr}.csv`;

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "text/csv");
    res.send(csvData);
  });
});

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
