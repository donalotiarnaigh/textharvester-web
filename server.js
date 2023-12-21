const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Configuration for Multer (File Uploading)
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, '/Users/danieltierney/Desktop/Dev/AI:ML/openai-playground/HG_TextHarvest_v2/uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Serve static files from the 'public' directory
app.use(express.static('public'));

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        console.log('Received file:', req.file.originalname);
        
        // Redirect to the processing page immediately
        res.redirect('/processing.html');

        // Start processing the file asynchronously
        processFile(req.file.path);
    } else {
        res.status(400).send('No file uploaded.');
    }
});

// Asynchronous file processing function
async function processFile(filePath) {
    const base64Image = fs.readFileSync(filePath, { encoding: 'base64' });

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "You're an expert in OCR and are working in a heritage/genealogy context assisting in data processing post graveyard survey.Examine these images and extract the handwritten text from the inscription field for each memorial number-no other fields..Respond in JSON format only.e.g {memorial_number: 69, inscription: SACRED HEART OF JESUS HAVE MERCY ON THE SOUL OF THOMAS RUANE LISNAGROOBE WHO DIED APRIL 16th 1923 AGED 74 YRS AND OF HIS WIFE MARGARET RUANE DIED JULY 26th 1929 AGED 78 YEARS R. I. P .ERECTED BY THEIR FOND SON THOMAS RUANE PHILADELPHIA USA}. If no memorial number or inscription is visible in an image,return a json with NULL in each field" },
                        {
                            type: "image_url",
                            image_url: {
                                "url": `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000
        });

        // Store the results
        storeResults(response.choices[0]);
    } catch (error) {
        console.error('Error in processing file:', error);
        // Handle error (e.g., write to a log, notify admin, etc.)
    }
}

// Function to store results in a file
function storeResults(data) {
    const resultsPath = '/Users/danieltierney/Desktop/Dev/AI:ML/openai-playground/HG_TextHarvest_v2/data/results.json'; // Define the path to your results file
    fs.writeFileSync(resultsPath, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/processing-status', (req, res) => {
    const resultsPath = '/Users/danieltierney/Desktop/Dev/AI:ML/openai-playground/HG_TextHarvest_v2/data/results.json';

    if (fs.existsSync(resultsPath)) {
        const fileContent = fs.readFileSync(resultsPath, 'utf-8');
        if (fileContent.length > 0) {
            res.json({ status: 'complete' });
        } else {
            res.json({ status: 'empty' });
        }
    } else {
        res.json({ status: 'processing' });
    }
});


app.get('/results-data', (req, res) => {
    const resultsPath = '/Users/danieltierney/Desktop/Dev/AI:ML/openai-playground/HG_TextHarvest_v2/data/results.json';

    fs.readFile(resultsPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading results file:', err);
            return res.status(500).send('Unable to retrieve results.');
        }
        res.json(JSON.parse(data));
    });
});


// Home route (can be removed if all UI is served from 'public')
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mockup.html'));
});

// Starting the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
