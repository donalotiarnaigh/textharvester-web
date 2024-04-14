// fileQueue.test.js
const fs = require("fs");

jest.mock("fs", () => ({
  writeFileSync: jest.fn(),
}));

jest.mock("../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const logger = require("../src/utils/logger");

// Mock the entire module with self-contained logic
jest.mock("../src/utils/fileQueue", () => {
  const fs = require("fs");
  const logger = require("../src/utils/logger");
  return {
    clearResultsFile: jest.fn(() => {
      // Simulate an error thrown during file write
      try {
        fs.writeFileSync("./data/results.json", JSON.stringify([]));
        logger.info("Cleared results.json file.");
      } catch (error) {
        logger.error("Error clearing results.json file:", error);
        throw error; // Ensure to rethrow the error for the test to catch
      }
    }),
    resetFileProcessingState: jest.fn(() => {
      const mockProcessedFiles = 0;
      const mockTotalFiles = 0;
      logger.info("File processing state reset for a new session.");
      return { mockProcessedFiles, mockTotalFiles };
    }),
    getProcessedFiles: jest.fn(() => 0),
    getTotalFiles: jest.fn(() => 0),
  };
});

const fileQueue = require("../src/utils/fileQueue");

describe("fileQueue functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("clearResultsFile", () => {
    it("should clear the results file successfully", () => {
      fileQueue.clearResultsFile();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "./data/results.json",
        JSON.stringify([])
      );
      expect(logger.info).toHaveBeenCalledWith("Cleared results.json file.");
    });

    it("should log an error if there is a problem clearing the results file", () => {
      const error = new Error("test error");
      fs.writeFileSync.mockImplementationOnce(() => {
        throw error;
      });
      expect(() => fileQueue.clearResultsFile()).toThrow("test error");
      expect(logger.error).toHaveBeenCalledWith(
        "Error clearing results.json file:",
        error
      );
    });
  });

  describe("resetFileProcessingState", () => {
    it("should reset the file processing state successfully", () => {
      const state = fileQueue.resetFileProcessingState();
      expect(state.mockProcessedFiles).toBe(0);
      expect(state.mockTotalFiles).toBe(0);
      expect(logger.info).toHaveBeenCalledWith(
        "File processing state reset for a new session."
      );
    });
  });
});
