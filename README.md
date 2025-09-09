# Text Harvester

Welcome to the Text Harvester, a community-driven web application designed to process and analyse handwritten text and optimised for record sheets and monument photos used in the heritage sector. Utilising advanced Optical Character Recognition (OCR) technology, the app extracts handwritten inscriptions from record sheets and weathered stone monuments, making historical data more accessible and preserving valuable information for future generations.

## Features

- **Dual Processing Modes**: 
  - **Record Sheet Mode**: Optimized for handwritten record sheets and forms
  - **Monument Photo Mode**: Specialized for weathered stone monuments and headstones
- **Drag-and-Drop File Upload**: Drag and drop JPEG images into the drop zone for processing, or click to select individual files or entire folders.
- **Progress Monitoring**: Real-time updates on the status of your uploads and OCR processing.
- **Multiple AI Providers**: Support for different vision AI models:
  - **OpenAI GPT-4o** (recommended for monument photos)
  - **Anthropic Claude 4 Sonnet** (good for clear images)
- **Intelligent Image Processing**:
  - Automatic image optimization for different AI providers
  - EXIF orientation correction for monument photos
  - File size optimization for provider limits
  - Optional monument cropping to reduce background before OCR (disabled by default)
- **Results Management**: 
  - Choose to replace existing results or add to them
  - Download extracted text data in JSON or CSV formats
  - Custom filename support for downloads
  - Source type tracking (Record Sheet vs Monument Photo)
- **Persistent Storage**: SQLite database ensures your data is safely stored and easily accessible
- **Automatic Backups**: Database backups are created automatically in the `backups/` directory

### Monument Cropping Configuration

Monument photo uploads can be pre-cropped before OCR to reduce file size. This feature is disabled by default. Enable it by setting the feature flag and thresholds:

```
MONUMENT_CROPPING_ENABLED=true
MONUMENT_MIN_WIDTH=400
MONUMENT_MIN_HEIGHT=400
MONUMENT_ASPECT_RATIO_MIN=0.5
MONUMENT_ASPECT_RATIO_MAX=2.0
```

These defaults are defined in `config.json` and can be adjusted to fit different datasets.

## Database

The application uses SQLite to store memorial records. The database file is located in `data/memorials.db`.

### Schema
```sql
CREATE TABLE memorials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memorial_number TEXT,
    first_name TEXT,
    last_name TEXT,
    year_of_death TEXT CONSTRAINT valid_year CHECK (year_of_death IS NULL OR (CAST(year_of_death AS INTEGER) > 1500 AND CAST(year_of_death AS INTEGER) <= 2100)),
    inscription TEXT,
    file_name TEXT NOT NULL,
    ai_provider TEXT,
    model_version TEXT,
    prompt_template TEXT,
    prompt_version TEXT,
    processed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_type TEXT
);

-- Indexes for optimized queries
CREATE INDEX idx_memorial_number ON memorials(memorial_number);
CREATE INDEX idx_name ON memorials(last_name, first_name);
CREATE INDEX idx_year ON memorials(year_of_death);
```

### Data Types and Constraints
- `memorial_number`: TEXT for flexible handling (extracted from filename for monuments)
- `year_of_death`: TEXT with validation (must be between 1500 and 2100, allows NULL and dash notation for illegible characters)
- `file_name`: Required field (NOT NULL)
- `ai_provider`: Tracks which AI service was used (e.g., 'openai', 'anthropic')
- `model_version`: Records the specific model version used
- `prompt_template`: Stores the prompt template used for extraction
- `prompt_version`: Tracks the version of the prompt used for extraction
- `processed_date`: Timestamp of when the record was processed
- `source_type`: Indicates the source of the data ('record_sheet' or 'monument_photo')
- Optimized indexes for common search patterns

## How It Works

1. **Select Processing Mode**:
   - **Record Sheet Mode**: For handwritten forms and record sheets
   - **Monument Photo Mode**: For weathered stone monuments and headstones
   - Mode selection is remembered between sessions

2. **Upload Your Images**:
   - Drag and drop JPEG images into the drop zone or click to select files
   - Choose whether to replace existing results or add to them
   - Support for both single files and entire folders
   - Process up to 1,000 files simultaneously
   - Images are automatically optimized based on selected AI provider

3. **Monitor Processing**:
   - Track progress on the processing page
   - Background processing allows continued app use
   - Real-time status updates
   - Different AI models provide different strengths for different image types

4. **View and Download Results**:
   - View all processed results on the results page
   - Filter by source type (Record Sheet vs Monument Photo)
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
  - OpenAI GPT-4o (recommended for monument photos)
  - Anthropic Claude 4 Sonnet (good for clear images)
- **Node.js**: Runtime environment

## Monument Photo Processing

The Text Harvester includes specialized functionality for processing weathered stone monuments and headstones:

### **Monument Photo Mode Features**
- **Genealogical Transcription Standards**: Uses dash notation (-) for illegible characters
- **Filename-Based Memorial Numbers**: Extracts memorial numbers from image filenames
- **EXIF Orientation Correction**: Automatically corrects image orientation based on camera metadata
- **Image Optimization**: Automatically optimizes images for different AI provider limits
- **Weathered Text Handling**: Specialized prompts for reading weathered, eroded, or damaged inscriptions

### **Best Practices for Monument Photos**
- **Image Quality**: Take photos in good lighting conditions
- **Angle**: Photograph monuments straight-on when possible
- **Filename Convention**: Use descriptive filenames like `monument_001.jpg` or `headstone_smith_001.jpg`
- **AI Model Selection**: GPT-4o is recommended for weathered monuments, Claude for clear images

### **Transcription Standards**
- **Exact Reproduction**: Text is transcribed exactly as it appears
- **Dash Notation**: Use single dashes (-) for each illegible character
- **Line Breaks**: Preserved using pipe (|) separators
- **Name Extraction**: First personal name and associated surname
- **Date Handling**: 4-digit years, with dashes for illegible digits

## Data Management

- Uploaded images are processed and automatically cleaned up after use
- Extracted text is stored in SQLite database
- Regular database backups are maintained
- Option to replace or append to existing records
- Export functionality for data portability
- Source type tracking for different processing modes

## Support

For support, questions, or feedback, contact us at [daniel@curlew.ie](daniel@curlew.ie).

Thank you for using the Text Harvester web app!

## Testing Different AI Providers

The application includes utilities to test and compare different AI providers:

1. **Process a file with a specific provider**:
   ```sh
   node scripts/process-with-provider.js openai path/to/image.jpg
   # or
   node scripts/process-with-provider.js anthropic path/to/image.jpg
   ```

2. **Compare results from all providers**:
   ```sh
   node scripts/test-providers.js path/to/image.jpg
   ```

3. **Switch the default provider** by changing the `AI_PROVIDER` environment variable in your `.env` file.

## Migration and Updates

If you're upgrading from a previous version, the application includes automatic database migrations:

1. **Run database migrations**:
   ```sh
   npm run migrate:add-source-type
   ```

2. **The migration will**:
   - Add the `source_type` column to existing databases
   - Maintain backwards compatibility with existing data
   - Preserve all existing memorial records
