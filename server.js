const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const moment = require("moment");
const config = require("./config.json");
const {
  enqueueFiles,
  dequeueFile,
  checkAndProcessNextFile,
} = require("./src/utils/fileQueue"); // Adjust path as needed
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

// The /upload route handler
app.post("/upload", (req, res) => {
  logger.info("Received an upload request.");
  const upload = multer({ storage: storage }).fields([
    { name: "file", maxCount: config.upload.maxFileCount }, // Respect config limit
    { name: "folder", maxCount: config.upload.maxFileCount }, // Adjust accordingly if different logic for folders
  ]);

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle multer-specific upload error
      logger.error("Multer upload error:", err);
    } else if (err) {
      // Handle unknown upload error
      logger.error("Unknown upload error:", err);
      return res.status(500).send("Unknown upload error.");
    }

    // Combine files from both 'file' and 'folder' inputs, filtering out .DS_Store
    const files = [
      ...(req.files.file || []),
      ...(req.files.folder || []),
    ].filter((file) => file.originalname !== ".DS_Store");

    if (files.length === 0) {
      // Handle no file uploaded
      logger.info("No files uploaded.");
      return res
        .status(400)
        .send(
          "No files uploaded, use your browser's back button and try again."
        );
    }

    // Define supported file types
    const supportedFileTypes = config.supportedFileTypes;
    // Validate each file's MIME type, excluding .DS_Store from causing validation errors
    const invalidFiles = files.filter(
      (file) =>
        !supportedFileTypes.includes(file.mimetype) &&
        file.originalname !== ".DS_Store"
    );

    if (invalidFiles.length > 0) {
      // Respond with an error if unsupported file types were found
      const invalidFileNames = invalidFiles
        .map((file) => file.originalname)
        .join(", ");
      logger.info(`Unsupported file types detected: ${invalidFileNames}`);
      return res
        .status(400)
        .send(
          `Unsupported file types detected: ${invalidFileNames}, use your browser's back button and try again`
        );
    }

    logger.info(`Received upload request with ${files.length} files.`);
    files.forEach((file, index) =>
      logger.info(`File ${index + 1}: ${file.originalname}`)
    );

    // Proceed with existing logic if all files are valid
    enqueueFiles(files);
    logger.info(`Enqueued ${files.length} file(s) for processing.`);
    clearProcessingCompleteFlag();
    totalFiles = files.length;
    processedFiles = 0; // Reset the processedFiles count for the new batch
    logger.info(`Processing ${totalFiles} files.`);
    clearResultsFile();
    startAsyncFileProcessing(files);
    logger.info("Started processing files asynchronously.");
    res.redirect("/processing.html");
  });
});

function clearProcessingCompleteFlag() {
  const flagPath = config.processingCompleteFlagPath;
  try {
    if (fs.existsSync(flagPath)) {
      fs.unlinkSync(flagPath);
      logger.info("Cleared existing processing completion flag.");
    }
  } catch (err) {
    logger.error("Error clearing processing completion flag:", err);
  }
}

function startAsyncFileProcessing() {
  // Initially check and process the next file in the queue
  checkAndProcessNextFile();
}

function clearResultsFile() {
  const resultsPath = config.resultsPath;
  try {
    fs.writeFileSync(resultsPath, JSON.stringify([]));
    logger.info("Cleared results.json file.");
  } catch (err) {
    logger.error("Error clearing results.json file:", err);
  }
}

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
