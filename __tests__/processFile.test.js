// fileProcessing.test.js
const fs = require("fs");
const OpenAI = require("openai");
const { processFile } = require("../src/utils/fileProcessing.js");
const logger = require("../src/utils/logger.js");

jest.mock("fs");
jest.mock("openai");
jest.mock("../src/utils/logger.js");

describe("processFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup fs.readFile to always succeed
    fs.readFile.mockImplementation((path, options, callback) => {
      const base64Image = "base64imagestring"; // Simulated base64 image string
      callback(null, base64Image);
    });
  });

  it("should process file successfully and return OCR text", async () => {
    const fakeFilePath = "path/to/fake/image.jpg";
    const ocrText = "Extracted OCR text";

    const mockResponse = {
      choices: [
        {
          message: { content: ocrText },
        },
      ],
    };

    OpenAI.prototype.chat = {
      completions: {
        create: jest.fn().mockResolvedValue(mockResponse),
      },
    };

    // Execute
    const result = await processFile(fakeFilePath);

    // Assert
    expect(OpenAI.prototype.chat.completions.create).toHaveBeenCalled();
    expect(result).toBe(ocrText);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("OCR text for")
    );
  });

  // Additional test to check the API call failure scenario
  it("should handle errors during API call", async () => {
    const fakeFilePath = "path/to/fake/image.jpg";
    const errorMessage = "API Error";

    OpenAI.prototype.chat.completions.create = jest
      .fn()
      .mockRejectedValue(new Error(errorMessage));

    await expect(processFile(fakeFilePath)).rejects.toThrow(Error);

    expect(OpenAI.prototype.chat.completions.create).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Error in processing file"), // Check for the substring in the first argument
      expect.anything() // This matcher accepts any argument for the error object
    );
  });
});
