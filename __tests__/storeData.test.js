const fs = require("fs");
const logger = require("../src/utils/logger.js");
const { storeResults } = require("../src/utils/fileProcessing"); // Adjust the path as needed

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
  it("should store new OCR results when no existing data is found", () => {
    const mockData = JSON.stringify([
      {
        memorial_number: "001",
        first_name: "John",
        last_name: "Doe",
        year_of_death: "1990",
        inscription: "Rest In Peace",
      },
    ]);
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {});

    storeResults(mockData);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("John"),
      expect.any(String)
    );
    expect(logger.info).toHaveBeenCalledWith(
      "No existing results found. Creating new results file."
    );
  });

  it("should append new data to existing results", () => {
    const existingData = [
      {
        memorial_number: "002",
        first_name: "Jane",
        last_name: "Smith",
        year_of_death: "1995",
        inscription: "Forever Remembered",
      },
    ];
    const newData = JSON.stringify([
      {
        memorial_number: "003",
        first_name: "Alice",
        last_name: "Johnson",
        year_of_death: "2000",
        inscription: "In Loving Memory",
      },
    ]);

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(existingData));
    fs.writeFileSync.mockImplementation(() => {});

    storeResults(newData);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("Alice"),
      expect.any(String)
    );
    expect(logger.info).toHaveBeenCalledWith(
      "Loading existing results from results.json..."
    );
  });

  it("should handle entries with null values correctly", () => {
    const partialData = JSON.stringify([
      {
        memorial_number: "004",
        first_name: "Tom",
        last_name: null, // Intentionally missing last name
        year_of_death: "1985",
        inscription: null, // Intentionally missing inscription
      },
    ]);

    const existingData = [
      {
        memorial_number: "005",
        first_name: "Lisa",
        last_name: "White",
        year_of_death: "1991",
        inscription: "Beloved",
      },
    ];

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(existingData));
    fs.writeFileSync.mockImplementation(() => {});

    storeResults(partialData);

    // Retrieve the actual JSON written to the file
    const writtenContent = JSON.parse(fs.writeFileSync.mock.calls[2][1]); // As it's the third call

    // Check if the data with null values is being written correctly
    expect(
      writtenContent.some(
        (entry) => entry.last_name === null && entry.inscription === null
      )
    ).toBeTruthy();
    expect(logger.info).toHaveBeenCalledWith(
      "Loading existing results from results.json..."
    );
  });
});
