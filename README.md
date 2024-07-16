# Historic Graves Text Harvester

Welcome to the Historic Graves Text Harvester, a community-driven web application designed to process and analyze images of historic graves. Utilizing advanced Optical Character Recognition (OCR) technology, the app extracts inscriptions from gravestones, making historical data more accessible and preserving valuable information for future generations.

## Features

- **Drag-and-Drop File Upload**: Drag and drop JPEG images or PDF documents into the drop zone for processing, or click to select individual files.
- **Progress Monitoring**: Real-time updates on the status of your uploads and OCR processing.
- **Results Retrieval with Custom Filenames**: Download the extracted text data in JSON or CSV formats with custom filenames.
- **User Authentication**: Secure user login and registration to protect data and access.
- **Protected Routes**: Ensure only authenticated users can access the core functionalities of the app.

## How It Works

1.  **Upload Your Files**:

    - Drag and drop JPEG images or PDF documents into the drop zone or click to select files from your device.
    - Each upload allows for multiple files to be processed simultaneously (up to 100MB per file).

2.  **Monitor Processing**:

    - After submitting your files, you'll be redirected to a processing page to track the progress.
    - Processing occurs in the background, allowing you to continue using the app or return later.

3.  **View and Download Results**:

    - Once processing is complete, view the extracted text on the results page.
    - Download results in JSON or CSV format with custom filenames.

## Running the App

The Historic Graves Text Harvester is currently hosted on a server and is not available for local deployment. Please visit the hosted application to use its functionalities.

## Technology

- **Express.js**: A robust web framework.
- **Multer**: Middleware for handling `multipart/form-data`.
- **OpenAI API**: Advanced AI and OCR technology for text extraction.
- **JWT**: Secure token-based authentication.
- **MongoDB**: Database for storing user information and job history.

## Data Privacy

Uploaded images and PDF documents are processed and deleted promptly after use. The extracted text data is stored temporarily for retrieval and is not used for any other purposes.

## Support

For support, questions, or feedback, contact us at [dev@danieltierney.ie](mailto:dev@danieltierney.ie). Your input is valuable, and we strive to improve the application continuously.

Thank you for using the Historic Graves Text Harvester!
