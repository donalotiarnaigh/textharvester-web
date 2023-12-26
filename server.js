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
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error uploading files:", err);
      return res.status(500).send("Error uploading files.");
    }

    if (req.files && req.files.length > 0) {
      const totalFiles = req.files.length;
      console.log(`Received ${totalFiles} files.`);
      clearResultsFile(); // Clear results.json before processing new files

      try {
        for (const file of req.files) {
          console.log(`Processing file: ${file.originalname}`);
          await processFile(file.path, totalFiles);
        }

        res.redirect("/processing.html");
      } catch (error) {
        console.error("Error processing files:", error);
        res.status(500).send("Error processing files.");
      }
    } else {
      console.log("No files uploaded.");
      res.status(400).send("No files uploaded.");
    }
  });
});

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
  const base64Image = fs.readFileSync(filePath, { encoding: "base64" });
  try {
    console.log(`Processing file: ${filePath}`);
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

    if (response.error) {
      console.error(
        `Error from OpenAI API for file ${filePath}:`,
        response.error
      );
    } else {
      console.log(`Received response from OpenAI for file: ${filePath}`);
      storeResults(response.choices[0]);
    }
  } catch (error) {
    console.error(`Error in processing file ${filePath}:`, error);
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file ${filePath}:`, err);
      } else {
        console.log(`Successfully deleted file ${filePath}`);
      }
    });
  }
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

app.get("/processing-status", (req, res) => {
  const flagPath = "./data/processing_complete.flag";
  const filesPath = "./uploads";

  try {
    if (fs.existsSync(flagPath)) {
      console.log("Processing complete, data available.");
      const processedFiles = fs.readdirSync(filesPath).length;
      const progressPercentage = (processedFiles / totalFiles) * 100;

      if (progressPercentage === 100) {
        req.files.forEach((file) => {
          fs.unlinkSync(file.path);
        });
      }

      res.json({ status: "complete", progress: progressPercentage });
      fs.unlinkSync(flagPath);
      console.log("Processing completion flag cleared.");
    } else {
      console.log("Processing ongoing.");
      res.json({ status: "processing", progress: 0 });
    }
  } catch (err) {
    console.error("Error checking processing status:", err);
    res.status(500).send("Error checking processing status.");
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
