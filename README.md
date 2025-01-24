# Text Harvester

Welcome to the Text Harvester, a community-driven web application designed to process and analyse handwritten text and optimised for record sheets used in the heritage sector. Utilising advanced Optical Character Recognition (OCR) technology, the app extracts handwritten inscriptions from record sheets, making historical data more accessible and preserving valuable information for future generations.

## Features

- **Drag-and-Drop File Upload**: Drag and drop JPEG images into the drop zone for processing, or click to select individual files or entire folders.
- **Progress Monitoring**: Real-time updates on the status of your uploads and OCR processing.
- **Results Retrieval with Custom Filenames**: Download the extracted text data in JSON or CSV formats with custom filenames.

## How It Works

1. **Upload Your Images**:

   - Drag and drop JPEG images into the drop zone or click to select files from your device.
   - You can upload an entire folder.
   - Each upload allows for up to 1,000 files to be processed simultaneously.

2. **Monitor Processing**:

   - After submitting your files, you'll be redirected to a processing page to track the progress.
   - Processing occurs in the background, allowing you to continue using the app or return later.

3. **View and Download Results**:
   - Once processing is complete, view the extracted text on the results page.
   - Download results in JSON or CSV format with custom filenames.

## Running the App Locally

To run the Historic Graves Text Harvester locally, follow these steps:

1. **Clone the Repository**:

   - Clone the repository from GitHub using the following command:
     ```sh
     git clone https://github.com/dtcurragh/HG_TextHarvester_v2.git
     ```

2. **Install Dependencies**:

   - Navigate to the cloned repository's directory:
     ```sh
     cd HG_TextHarvester_v2
     ```
   - Install the required dependencies with npm:
     ```sh
     npm install
     ```

3. **Set Up Configuration**:

   - Create a `.env` file in the root directory of your project if it doesn't exist.
   - Add any necessary environment variables as per your configuration requirements. For example:
     ```
     PORT=3000
     OTHER_VARIABLE=value
     ```

4. **Run the App**:
   - Start the app using `node` or `nodemon`:
     ```sh
     npm start
     ```
   - The app will run on `localhost:3000`.

## Technology

- **Express.js**: A robust web framework.
- **Multer**: Middleware for handling `multipart/form-data`.
- **OpenAI API**: Advanced AI and OCR technology for text extraction.
- **Node.js**: JavaScript runtime for server-side programming.

## Data Privacy

Uploaded images are processed and deleted promptly after use. The extracted text data is stored temporarily for retrieval and is not used for any other purposes.

## Support

For support, questions, or feedback, contact us at [daniel@textharvester.ie](mailto:daniel@textharvester.ie).

Thank you for using the Text Harvester web app!
