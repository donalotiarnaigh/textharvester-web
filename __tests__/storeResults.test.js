const fs = require("fs");
const path = require("path");
const { storeResults } = require("../src/utils/fileProcessing.js");
const logger = require("../src/utils/logger.js");

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock("../src/utils/logger.js", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe("storeResults function", () => {
  // Updated to reflect the correct path based on the provided directory structure
  const resultsDir = path.resolve(__dirname, "../data");
  const resultsPath = path.join(resultsDir, "results.json");

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
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

    fs.existsSync.mockImplementation((path) => path === resultsPath);
    fs.readFileSync.mockReturnValue("[]");

    storeResults(mockData);

    expect(fs.existsSync).toHaveBeenCalledWith(resultsDir);
    expect(fs.mkdirSync).toHaveBeenCalledWith(resultsDir, { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      resultsPath,
      expect.any(String),
      "utf8"
    );
    const writtenContent = fs.writeFileSync.mock.calls[0][1];
    expect(writtenContent).toContain("file_1234567890.jpg");
    expect(writtenContent).toContain("John");
    expect(logger.info).toHaveBeenCalledWith(
      "Results successfully stored in results.json."
    );
  });
});
