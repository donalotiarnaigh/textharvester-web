const winston = require("winston");
const config = require("../config.json");

// Mock winston and config before importing the logger module
jest.mock("winston", () => {
  const mLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    add: jest.fn(), // Ensure the `add` method is mocked.
  };
  return {
    createLogger: jest.fn(() => mLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      printf: jest.fn(),
      colorize: jest.fn(),
      simple: jest.fn(),
      errors: jest.fn(),
    },
    transports: {
      File: jest.fn(),
      Console: jest.fn(),
    },
  };
});

jest.mock("../config.json", () => ({
  logging: {
    level: "info",
    errorLogFile: "/logs/error.log",
    combinedLogFile: "/logs/combined.log",
  },
  environment: "development",
}));

const logger = require("../src/utils/logger.js");

describe("Logger Configuration", () => {
  it("should configure the logger with the correct level from config", () => {
    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
      })
    );
  });

  it("should setup file transports with filenames from config", () => {
    const fileTransportCall = winston.transports.File.mock.calls;
    expect(fileTransportCall[0][0]).toEqual(
      expect.objectContaining({
        filename: "/logs/error.log",
        level: "error",
      })
    );
    expect(fileTransportCall[1][0]).toEqual(
      expect.objectContaining({
        filename: "/logs/combined.log",
      })
    );
  });

  it("should add console transport in development environment", () => {
    expect(winston.transports.Console).toHaveBeenCalled();
    expect(winston.format.colorize).toHaveBeenCalled();
    expect(winston.format.simple).toHaveBeenCalled();
  });
});
