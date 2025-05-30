# Text Harvester

Welcome to the Text Harvester, a community-driven web application designed to process and analyse handwritten text and optimised for record sheets used in the heritage sector. Utilising advanced Optical Character Recognition (OCR) technology, the app extracts handwritten inscriptions from record sheets, making historical data more accessible and preserving valuable information for future generations.

## Features

- **Drag-and-Drop File Upload**: Drag and drop JPEG images into the drop zone for processing, or click to select individual files or entire folders.
- **Progress Monitoring**: Real-time updates on the status of your uploads and OCR processing.
- **Multiple AI Providers**: Support for different vision AI models:
  - OpenAI GPT-4o (default)
  - Anthropic Claude 3.7 Sonnet
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
    memorial_number INTEGER,
    first_name TEXT,
    last_name TEXT,
    year_of_death INTEGER CONSTRAINT valid_year CHECK (year_of_death IS NULL OR (year_of_death > 1500 AND year_of_death <= 2100 AND typeof(year_of_death) = 'integer')),
    inscription TEXT,
    file_name TEXT NOT NULL,
    ai_provider TEXT,
    model_version TEXT,
    prompt_template TEXT,
    prompt_version TEXT,
    processed_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimized queries
CREATE INDEX idx_memorial_number ON memorials(memorial_number);
CREATE INDEX idx_name ON memorials(last_name, first_name);
CREATE INDEX idx_year ON memorials(year_of_death);
```

### Data Types and Constraints
- `memorial_number`: Integer for consistent numeric handling
- `year_of_death`: Integer with validation (must be between 1500 and 2100, allows NULL)
- `file_name`: Required field (NOT NULL)
- `ai_provider`: Tracks which AI service was used (e.g., 'openai', 'anthropic')
- `model_version`: Records the specific model version used
- `prompt_template`: Stores the prompt template used for extraction
- `prompt_version`: Tracks the version of the prompt used for extraction
- `processed_date`: Timestamp of when the record was processed
- Optimized indexes for common search patterns

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
     # AI Provider Configuration
     # Set AI_PROVIDER to 'openai' or 'anthropic'
     AI_PROVIDER=openai
     # API Keys
     OPENAI_API_KEY=your_openai_api_key
     ANTHROPIC_API_KEY=your_anthropic_api_key
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
- **AI Vision Models**: 
  - OpenAI GPT-4o
  - Anthropic Claude 3.7 Sonnet
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

## Testing Different AI Providers

The application includes utilities to test and compare different AI providers:

1. **Process a file with a specific provider**:
   ```sh
   node src/utils/processWithProvider.js openai path/to/image.jpg
   # or
   node src/utils/processWithProvider.js anthropic path/to/image.jpg
   ```

2. **Compare results from all providers**:
   ```sh
   node src/utils/testProviders.js path/to/image.jpg
   ```

3. **Switch the default provider** by changing the `AI_PROVIDER` environment variable in your `.env` file.
