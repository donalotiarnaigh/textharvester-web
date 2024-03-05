import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const openai = new OpenAI();

// Function to encode the image to base64
function encodeImageToBase64(filePath) {
  return fs.readFileSync(filePath, { encoding: "base64" });
}

async function main() {
  // Convert the image to a base64 string
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const imagePath = path.join(__dirname, "page_7.jpg"); // Update this path to your image file
  const base64Image = encodeImageToBase64(imagePath);

  // Make the API request
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "You're an expert in OCR and are working in a heritage/genealogy context assisting in data processing post graveyard survey. Examine these images and extract the handwritten text from the inscription field for each memorial number - no other fields. Respond in JSON format only.",
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
  });
  console.log(response.choices[0]);
}

main();
