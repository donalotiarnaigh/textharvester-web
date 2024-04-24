const fs = require("fs");
const { storeResults } = require("../src/utils/fileProcessing.js");
const logger = require("../src/utils/logger.js");

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

    // Mock fs functions
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockImplementation(() => "{}"); // Default to empty data
    fs.writeFileSync.mockImplementation(() => {}); // Do nothing when called
  });

  it("should store new OCR results with unique filename", () => {
    const mockData = {
      ocrText: JSON.stringify({
        memorial_number: "1",
        first_name: "John",
        last_name: "Doe",
        year_of_death: "2000",
        inscription: "Rest In Peace",
      }),
      uniqueFilename: "uploads/file_1234567890.jpg",
    };

    fs.existsSync.mockReturnValue(false);

    storeResults(mockData);

    expect(fs.writeFileSync).toHaveBeenCalled(); // Verify writeFileSync is called
    const writtenContent = fs.writeFileSync.mock.calls[0][1];
    expect(writtenContent).toContain("file_1234567890.jpg"); // Ensure unique filename is included
    expect(writtenContent).toContain("John"); // Verify data is stored correctly

    expect(logger.info).toHaveBeenCalledWith(
      "Results successfully stored in results.json."
    );
  });

  it("should append new OCR results with unique filename to existing data", () => {
    const existingData = JSON.stringify([
      {
        memorial_number: "002",
        first_name: "Jane",
        last_name: "Smith",
        year_of_death: "1995",
        inscription: "Forever Remembered",
      },
    ]);

    const newData = {
      ocrText: JSON.stringify({
        memorial_number: "003",
        first_name: "Alice",
        last_name: "Johnson",
        year_of_death: "2010",
        inscription: "In Loving Memory",
      }),
      uniqueFilename: "uploads/file_0987654321.jpg",
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(existingData);

    storeResults(newData);

    expect(fs.writeFileSync).toHaveBeenCalled();
    const writtenContent = fs.writeFileSync.mock.calls[0][1];
    expect(writtenContent).toContain("file_0987654321.jpg"); // Verify unique filename is included
    expect(writtenContent).toContain("Johnson"); // Verify correct data storage

    expect(logger.info).toHaveBeenCalledWith(
      "Results successfully stored in results.json."
    );
  });

  it("should handle results with null values and unique filename", () => {
    const newData = {
      ocrText: JSON.stringify({
        memorial_number: null,
        first_name: "Unknown",
        last_name: null,
        year_of_death: null,
        inscription: null,
      }),
      uniqueFilename: "uploads/file_1234567890.jpg",
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("[]"); // Simulate empty existing results

    storeResults(newData);

    expect(fs.writeFileSync).toHaveBeenCalled();
    const writtenContent = fs.writeFileSync.mock.calls[0][1];
    expect(writtenContent).toContain("file_1234567890.jpg"); // Ensure unique filename is included
    expect(writtenContent).toContain("Unknown"); // Check handling of null values

    expect(logger.info).toHaveBeenCalledWith(
      "Results successfully stored in results.json."
    );
  });
});
