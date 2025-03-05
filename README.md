# Text Harvester

Welcome to the Text Harvester, a community-driven web application designed to process and analyse handwritten text and optimised for record sheets used in the heritage sector. Utilising advanced Optical Character Recognition (OCR) technology, the app extracts handwritten inscriptions from record sheets, making historical data more accessible and preserving valuable information for future generations.

## Features

- **Drag-and-Drop File Upload**: Drag and drop JPEG images into the drop zone for processing, or click to select individual files or entire folders.
- **Progress Monitoring**: Real-time updates on the status of your uploads and OCR processing.
- **Results Management**: 
  - Choose to replace existing results or add to them
  - Download extracted text data in JSON or CSV formats
  - Custom filename support for downloads
- **Persistent Storage**: SQLite database ensures your data is safely stored and easily accessible
- **Automatic Backups**: Database backups are created automatically in the `backups/` directory

## Database

The application uses SQLite to store memorial records. The database file is located in `data/memorials.db`.

### Schema
```sql
CREATE TABLE memorials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memorial_number TEXT,
    first_name TEXT,
    last_name TEXT,
    year_of_death TEXT,
    inscription TEXT,
    file_name TEXT,
    processed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    confidence_score FLOAT
)
```

## How It Works

1. **Upload Your Images**:
   - Drag and drop JPEG images into the drop zone or click to select files
   - Choose whether to replace existing results or add to them
   - Support for both single files and entire folders
   - Process up to 1,000 files simultaneously

2. **Monitor Processing**:
   - Track progress on the processing page
   - Background processing allows continued app use
   - Real-time status updates

3. **View and Download Results**:
   - View all processed results on the results page
   - Download in JSON or CSV format
   - Customize download filenames
   - Results persist between sessions

## Running the App Locally

To run the Historic Graves Text Harvester locally, follow these steps:

1. **Clone the Repository**:
   ```sh
   git clone https://github.com/dtcurragh/HG_TextHarvester_v2.git
   ```

2. **Install Dependencies**:
   ```sh
   cd HG_TextHarvester_v2
   npm install
   ```

3. **Set Up Configuration**:
   - Create a `.env` file in the root directory
   - Add required environment variables:
     ```
     PORT=3000
     OPENAI_API_KEY=your_api_key_here
     ```

4. **Run the App**:
   ```sh
   npm run local-start
   ```
   The app will run on `localhost:3000`

## Technology

- **Express.js**: Web framework
- **SQLite**: Persistent data storage
- **Multer**: File upload handling
- **OpenAI API**: AI-powered OCR
- **Node.js**: Runtime environment

## Data Management

- Uploaded images are processed and automatically cleaned up after use
- Extracted text is stored in SQLite database
- Regular database backups are maintained
- Option to replace or append to existing records
- Export functionality for data portability

## Support

For support, questions, or feedback, contact us at [daniel@curlew.ie](daniel@curlew.ie).

Thank you for using the Text Harvester web app!
