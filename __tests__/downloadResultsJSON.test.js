const { downloadResultsJSON } = require("../src/controllers/resultsManager"); // Adjust path as needed
const httpMocks = require("node-mocks-http"); // Mock HTTP request/response
const path = require("path");
const fs = require("fs");
const config = require("../config.json");

describe("downloadResultsJSON", () => {
  it("should set the correct Content-Disposition header based on the filename parameter", () => {
    // Create a mock request with a query parameter for the filename
    const req = httpMocks.createRequest({
      method: "GET",
      url: "/download-json",
      query: {
        filename: "test_filename",
      },
    });

    // Create a mock response
    const res = httpMocks.createResponse();

    // Mock the sendFile method to prevent actual file operations
    res.sendFile = jest.fn();

    // Call the function with the mock request and response
    downloadResultsJSON(req, res);

    const expectedResultsPath = path.join(__dirname, "../data/results.json");

    // Assert that the Content-Disposition header is set with the correct filename
    expect(res.getHeader("Content-Disposition")).toEqual(
      'attachment; filename="test_filename.json"'
    );

    // Assert that the correct file path was used for the sendFile method
    expect(res.sendFile).toHaveBeenCalledWith(expectedResultsPath);
  });
});
