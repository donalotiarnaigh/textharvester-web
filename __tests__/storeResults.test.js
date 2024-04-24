const fs = require("fs");
const logger = require("../src/utils/logger.js");
const { storeResults } = require("../src/utils/fileProcessing.js"); // Adjust the path as needed

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock("../src/utils/logger.js", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe("storeResults function", () => {
  beforeEach(() => {
    jest.resetAllMocks(); // Resets the state of all mocks
    jest.clearAllMocks(); // Clears any calls to mocks

    // Re-initialize the mocks for fs functions
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockImplementation(() => "{}");
    fs.writeFileSync.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restores to original functions
  });

  it("should store new OCR results with the unique filename", () => {
    const mockData = {
      ocrText: "Sample OCR text",
      uniqueFilename: "file_1234567890.jpg",
    };

    fs.existsSync.mockReturnValue(false);

    storeResults(mockData);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("file_1234567890.jpg"), // Verify unique filename is included
      expect.any(String)
    );
    expect(logger.info).toHaveBeenCalledWith(
      "No existing results found. Creating new results file."
    );
  });

  it("should append new OCR results with unique filename to existing data", () => {
    const existingData = [
      {
        memorial_number: "002",
        first_name: "Jane",
        last_name: "Smith",
        year_of_death: "1995",
        inscription: "Forever Remembered",
      },
    ];

    const newData = {
      ocrText: "Sample OCR text for new data",
      uniqueFilename: "file_0987654321.jpg",
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(existingData));

    storeResults(newData);

    const writtenContent = fs.writeFileSync.mock.calls[0][1];
    expect(writtenContent).toContain("file_0987654321.jpg"); // Check unique filename is appended
    expect(logger.info).toHaveBeenCalledWith(
      "Loading existing results from results.json..."
    );
  });

  it("should handle results with null values and unique filename", () => {
    const newData = {
      ocrText: "Sample OCR text with null values",
      uniqueFilename: "file_1234567890.jpg", // Unique filename
      memorial_number: null, // Intentionally set to null
      first_name: "Test",
      last_name: null, // Intentionally set to null
      year_of_death: null, // Intentionally set to null
      inscription: null, // Intentionally set to null
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([])); // Existing data is empty

    storeResults(newData);

    const writtenContent = fs.writeFileSync.mock.calls[0][1];
    expect(writtenContent).toContain("file_1234567890.jpg"); // Ensure unique filename is included
    expect(writtenContent).toContain("null"); // Ensure null values are correctly handled
  });
});
