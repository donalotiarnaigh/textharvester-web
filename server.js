const express = require('express');
const multer = require('multer');
const path = require('path');

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


// Serve static files from the 'public' directory
app.use(express.static('public'));

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        console.log('Received file:', req.file.originalname);

        // TODO: Add your processing logic here

        // Redirect to the processing page
        res.redirect('/processing.html');
    } else {
        res.status(400).send('No file uploaded.');
    }
});


// Home route (can be removed if all UI is served from 'public')
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mockup.html'));
});

// Starting the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
