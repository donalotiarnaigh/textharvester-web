const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");
require("dotenv").config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI(process.env.OPENAI_API_KEY);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage }).array("file", 10); // Set a limit for the number of files (e.g., 10)

app.use(express.static("public"));

app.post("/upload", (req, res) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      console.error("Multer upload error:", err);
      return res.status(500).send("Multer upload error.");
    } else if (err) {
      // An unknown error occurred when uploading.
      console.error("Unknown upload error:", err);
      return res.status(500).send("Unknown upload error.");
    }

    if (!req.files || req.files.length === 0) {
      console.log("No files uploaded.");
      return res.status(400).send("No files uploaded.");
    }

    // Clear any existing processing completion flag
    clearProcessingCompleteFlag();

    // Update totalFiles with the number of files uploaded
    totalFiles = req.files.length;
    processedFiles = 0; // Reset the processedFiles count for the new batch

    // Clear results.json before processing new files
    clearResultsFile();

    // Start processing files asynchronously
    startAsyncFileProcessing(req.files);

    // Immediately redirect to processing.html to monitor the progress
    res.redirect("/processing.html");
  });
});

function clearProcessingCompleteFlag() {
  const flagPath = "./data/processing_complete.flag";
  try {
    if (fs.existsSync(flagPath)) {
      fs.unlinkSync(flagPath);
      console.log("Cleared existing processing completion flag.");
    }
  } catch (err) {
    console.error("Error clearing processing completion flag:", err);
  }
}

function startAsyncFileProcessing(files) {
  // Map each file to a promise using the processFile function
  let processingPromises = files.map((file) => processFile(file.path));

  // Use Promise.allSettled to wait for all promises to settle (either resolved or rejected)
  Promise.allSettled(processingPromises).then((results) => {
    // All files are now processed
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(
          `File ${files[index].originalname} processed successfully.`
        );
      } else {
        console.error(
          `File ${files[index].originalname} failed to process:`,
          result.reason
        );
      }
    });

    // Set a flag or update the status here
    setProcessingCompleteFlag(); // Implement this function as needed
  });
}

function clearResultsFile() {
  const resultsPath = "./data/results.json";
  try {
    fs.writeFileSync(resultsPath, JSON.stringify([]));
    console.log("Cleared results.json file.");
  } catch (err) {
    console.error("Error clearing results.json file:", err);
  }
}

async function processFile(filePath, totalFiles) {
  return new Promise((resolve, reject) => {
    // Read the file and encode it to base64
    fs.readFile(filePath, { encoding: "base64" }, async (err, base64Image) => {
      if (err) {
        console.error(`Error reading file ${filePath}:`, err);
        reject(`Error reading file ${filePath}`);
        return;
      }

      try {
        // Processing the file with OpenAI
        const response = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "You're an expert in OCR and are working in a heritage/genealogy context assisting in data processing post graveyard survey. Examine these images and extract the handwritten text from the inscription field for each memorial number - no other fields. Respond in JSON format only. e.g., {memorial_number: 69, inscription: SACRED HEART OF JESUS HAVE MERCY ON THE SOUL OF THOMAS RUANE LISNAGROOBE WHO DIED APRIL 16th 1923 AGED 74 YRS AND OF HIS WIFE MARGARET RUANE DIED JULY 26th 1929 AGED 78 YEARS R. I. P. ERECTED BY THEIR FOND SON THOMAS RUANE PHILADELPHIA USA}. If no memorial number or inscription is visible in an image, return a JSON with NULL in each field",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
        });

        // Assuming storeResults is a function to handle storing the OpenAI response
        storeResults(response.choices[0]);

        // Increment the count of processed files
        processedFiles++;

        // Check if all files have been processed and set the flag
        if (processedFiles === totalFiles) {
          setProcessingCompleteFlag();
        } else {
          console.log(
            `Processed ${processedFiles} out of ${totalFiles} files. Flag not set yet.`
          );
        }

        resolve(response); // Resolve the promise with the response or some success indicator
      } catch (error) {
        console.error(`Error in processing file ${filePath}:`, error);
        reject(error); // Reject the promise with the error
      } finally {
        // Cleanup: delete the processed file regardless of success or failure
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error deleting file ${filePath}:`, err);
          } else {
            console.log(`Successfully deleted file ${filePath}`);
          }
        });
      }
    });
  });
}

function storeResults(data) {
  const resultsPath = "./data/results.json";
  try {
    let existingResults = [];
    if (fs.existsSync(resultsPath)) {
      const data = fs.readFileSync(resultsPath, "utf8");
      existingResults = JSON.parse(data);
    }

    const rawJsonString = data.message.content
      .replace("```json\n", "")
      .replace("\n```", "")
      .trim();

    let parsedData = JSON.parse(rawJsonString);

    if (!Array.isArray(parsedData)) {
      parsedData = [parsedData];
    }

    const formattedData = parsedData.map((item) => ({
      memorial_number: item.memorial_number,
      inscription: item.inscription,
    }));

    const allResults = existingResults.concat(formattedData);

    fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2), "utf8");
    console.log("Stored formatted results in results.json.");
  } catch (err) {
    console.error("Error in storeResults function:", err);
  }
}

function setProcessingCompleteFlag() {
  const flagPath = "./data/processing_complete.flag";
  try {
    // Write an empty file or some content to indicate completion
    fs.writeFileSync(flagPath, "complete");
    console.log("Processing completion flag set.");
  } catch (err) {
    console.error("Error setting processing completion flag:", err);
  }
}

app.get("/processing-status", (req, res) => {
  let progress = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0; // Calculate progress percentage

  if (processedFiles >= totalFiles) {
    // When all files are processed, report completion
    res.json({ status: "complete", progress: 100 });
  } else {
    // While processing is ongoing, report the current progress
    res.json({ status: "processing", progress: progress.toFixed(2) });
  }
});

app.get("/results-data", (req, res) => {
  const resultsPath = "./data/results.json";

  try {
    const data = fs.readFileSync(resultsPath, "utf8");
    console.log("Sending results data.");
    res.json(JSON.parse(data));
  } catch (err) {
    console.error("Error reading results file:", err);
    res.status(500).send("Unable to retrieve results.");
  }
});

app.get("/download-results", (req, res) => {
  const resultsPath = "./data/results.json";

  try {
    res.setHeader("Content-Disposition", "attachment; filename=results.json");
    res.setHeader("Content-Type", "application/json");
    res.sendFile(path.join(__dirname, resultsPath));
  } catch (err) {
    console.error("Error reading results file:", err);
    res.status(500).send("Unable to retrieve results.");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
