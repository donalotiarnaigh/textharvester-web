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

const upload = multer({ storage: storage });

app.use(express.static("public"));

app.post("/upload", upload.single("file"), (req, res) => {
  if (req.file) {
    console.log(`Received file: ${req.file.originalname}`);
    clearResultsFile();
    res.redirect("/processing.html");
    processFile(req.file.path);
  } else {
    console.log("No file uploaded.");
    res.status(400).send("No file uploaded.");
  }
});

function clearResultsFile() {
  const resultsPath = "./data/results.json";
  try {
    fs.writeFileSync(resultsPath, JSON.stringify({}));
    console.log("Cleared results.json file.");
  } catch (err) {
    console.error("Error clearing results.json file:", err);
  }
}

async function processFile(filePath) {
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
              text: "ou're an expert in OCR and are working in a heritage/genealogy context assisting in data processing post graveyard survey.Examine these images and extract the handwritten text from the inscription field for each memorial number-no other fields..Respond in JSON format only.e.g {memorial_number: 69, inscription: SACRED HEART OF JESUS HAVE MERCY ON THE SOUL OF THOMAS RUANE LISNAGROOBE WHO DIED APRIL 16th 1923 AGED 74 YRS AND OF HIS WIFE MARGARET RUANE DIED JULY 26th 1929 AGED 78 YEARS R. I. P .ERECTED BY THEIR FOND SON THOMAS RUANE PHILADELPHIA USA}. If no memorial number or inscription is visible in an image,return a json with NULL in each field",
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
  const flagPath = "./data/processing_complete.flag";

  try {
    // Log the raw data for debugging
    console.log("Raw data from OpenAI:", JSON.stringify(data));

    // Check if data.message and data.message.content exist
    if (!data.message || !data.message.content) {
      console.error("Invalid data format: missing message or content field");
      return;
    }

    // Extract and clean the JSON string from the content field
    const rawJsonString = data.message.content
      .replace("```json\n", "")
      .replace("\n```", "")
      .trim();

    // Log the extracted string for debugging
    console.log("Extracted JSON string:", rawJsonString);

    // Parse the JSON string
    let parsedData = JSON.parse(rawJsonString);

    // Check if parsedData is an array; if not, make it an array
    if (!Array.isArray(parsedData)) {
      parsedData = [parsedData]; // Convert to an array with a single element
    }

    // Map over the parsed data to create a new array containing only the required fields
    const formattedData = parsedData.map((item) => ({
      memorial_number: item.memorial_number,
      inscription: item.inscription,
    }));

    // Write the formatted data to results.json
    fs.writeFileSync(
      resultsPath,
      JSON.stringify(formattedData, null, 2),
      "utf8"
    );
    console.log("Stored formatted results in results.json.");

    // Set a flag to indicate processing is complete
    fs.writeFileSync(flagPath, "complete");
    console.log("Set processing completion flag.");
  } catch (err) {
    console.error("Error in storeResults function:", err);
  }
}

app.get("/processing-status", (req, res) => {
  const flagPath = "./data/processing_complete.flag";

  try {
    if (fs.existsSync(flagPath)) {
      console.log("Processing complete, data available.");
      res.json({ status: "complete" });
      fs.unlinkSync(flagPath);
      console.log("Processing completion flag cleared.");
    } else {
      console.log("Processing ongoing.");
      res.json({ status: "processing" });
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
