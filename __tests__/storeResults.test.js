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
    jest.isolateModules(() => {
      const fs = require("fs");
      const logger = require("../src/utils/logger.js");
      const { storeResults } = require("../src/utils/fileProcessing.js");

      // Setup mock implementations within this isolated module environment
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify([
          {
            memorial_number: "005",
            first_name: "Lisa",
            last_name: "White",
            year_of_death: "1991",
            inscription: "Beloved",
          },
        ])
      );
      fs.writeFileSync.mockImplementation(() => {});

      const partialData = JSON.stringify([
        {
          memorial_number: "004",
          first_name: "Tom",
          last_name: null, // Intentionally missing last name
          year_of_death: "1985",
          inscription: null, // Intentionally missing inscription
        },
      ]);

      storeResults(partialData);

      // Ensure there are enough calls to writeFileSync before accessing them
      if (fs.writeFileSync.mock.calls.length > 0) {
        const writtenContent = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
        expect(
          writtenContent.some(
            (entry) => entry.last_name === null && entry.inscription === null
          )
        ).toBeTruthy();
      } else {
        throw new Error("fs.writeFileSync was not called as expected.");
      }

      expect(logger.info).toHaveBeenCalledWith(
        "Loading existing results from results.json..."
      );
    });
  });

  it("should sort results by memorial number correctly, placing null values at the end", () => {
    const mixedData = JSON.stringify([
      { memorial_number: "300", first_name: "Charlie" },
      { memorial_number: null, first_name: "Unknown" },
      { memorial_number: "200", first_name: "Bob" },
      { memorial_number: "100", first_name: "Alice" },
    ]);

    const existingData = [{ memorial_number: "001", first_name: "John" }];

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(existingData));
    fs.writeFileSync.mockImplementation(() => {});

    storeResults(mixedData);

    // Retrieve the actual JSON written to the file
    const writtenContent = JSON.parse(fs.writeFileSync.mock.calls[0][1]);

    // Additional debug output to understand the full output
    console.log(
      "Full written content:",
      writtenContent.map(
        (item) => `${item.memorial_number}: ${item.first_name}`
      )
    );

    // Check if the array has the expected length before making specific checks
    expect(writtenContent.length).toBe(5);

    if (writtenContent.length >= 5) {
      // Only perform these checks if there are enough elements
      expect(writtenContent[0].memorial_number).toBe("001"); // John
      expect(writtenContent[1].memorial_number).toBe("100"); // Alice
      expect(writtenContent[2].memorial_number).toBe("200"); // Bob
      expect(writtenContent[3].memorial_number).toBe("300"); // Charlie
      expect(writtenContent[4].memorial_number).toBe(null); // Unknown
    }

    expect(logger.info).toHaveBeenCalledWith(
      "Loading existing results from results.json..."
    );
  });
});
