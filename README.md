# Historic Graves Text Harvester

Welcome to the Historic Graves Text Harvester, a community-driven web application designed to process and analyze images of historic graves. Utilizing advanced Optical Character Recognition (OCR) technology, our app is adept at extracting inscriptions from images of gravestones, making historical data more accessible and preservable.

## Features

- **File and Folder Upload:** Securely upload individual images or an entire folder containing up to 10 images simultaneously for processing.
- **Progress Monitoring:** Real-time updates on the processing status of your uploads.
- **Results Retrieval:** Access and download the extracted text data in a convenient JSON format.

## How It Works

1. **Upload Your Images or Folders:**

   - Navigate to the upload section on the homepage.
   - Select JPEG images of grave inscriptions or choose an entire folder for upload.

2. **Monitor Processing:**

   - Stay on the page as we process your files or folder. The application will update you on the progress.
   - You can leave the page running in the background if needed.

3. **Access Results:**
   - Once processing is complete, view the extracted text on the results page.
   - Download the results as a JSON file for your convenience and further analysis.

## Getting Started

1. **Prepare Your Images:**
   Ensure your images are clear and in JPEG format. For folder uploads, make sure all images within are relevant to optimize processing efficiency. The better the quality, the more accurate the text extraction will be.

2. **Visit the Web Application:**
   Access the application through your preferred web browser. The interface is intuitive and user-friendly.

3. **Follow the Instructions:**
   On the homepage, you'll find step-by-step instructions on how to upload individual images or an entire folder and process your images.

## Technology

- **Express.js:** A robust web application framework.
- **Multer:** A middleware for handling `multipart/form-data`, supporting both files and folder uploads.
- **OpenAI API:** Leveraging the latest in OCR and AI technology for text extraction.

## Data Privacy

We are committed to ensuring the privacy and security of your data. Images and folders are processed and then promptly deleted after use. Results are stored temporarily for retrieval and are not used for any other purposes.

## Support

For support, queries, or feedback, please contact us at [dev@danieltierney.ie](mailto:dev@danieltierney.ie). Your input is valuable, and we strive to improve the application continuously.

Thank you for using the Historic Graves Text Harvester!
