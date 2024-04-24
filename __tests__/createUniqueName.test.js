const path = require("path");
const { createUniqueName } = require("../src/controllers/uploadHandler.js"); // Adjust path as needed

describe("createUniqueName function", () => {
  it("should generate a unique name with the base of the original filename and a timestamp", () => {
    const file = {
      originalname: "page_1.jpg", // Example original filename
    };

    const uniqueName = createUniqueName(file);

    // Validate the unique name structure
    const baseFilename = path.basename(uniqueName, path.extname(uniqueName)); // Base filename without extension
    const extension = path.extname(uniqueName); // File extension

    expect(extension).toBe(".jpg"); // Check if the correct extension is retained
    expect(baseFilename).toMatch(/^page_1_\d+$/); // Check if it includes base and timestamp
  });

  it("should replace special characters with underscores", () => {
    const file = {
      originalname: "test@file!.jpg", // Original filename with special characters
    };

    const uniqueName = createUniqueName(file);

    const baseFilename = path.basename(uniqueName, path.extname(uniqueName)); // Base filename without extension

    expect(baseFilename).not.toContain("@");
    expect(baseFilename).not.toContain("!");
    expect(baseFilename).toContain("_"); // Ensure special characters are replaced with underscores
  });
});
