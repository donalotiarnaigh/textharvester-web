const { jsonToCsv } = require("../src/utils/dataConversion");

describe("jsonToCsv", () => {
  it("converts JSON to CSV format", () => {
    // Use the correct structure for your test data
    const jsonData = [
      { number: 1, memorial_number: "001", inscription: "Rest In Peace" },
      { number: 2, memorial_number: "002", inscription: "Forever Remembered" },
    ];
    // Define the expected CSV output
    const expectedCsv = `number,memorial_number,inscription\n1,001,"Rest In Peace"\n2,002,"Forever Remembered"\n`;

    // Call the jsonToCsv function with the test data
    const resultCsv = jsonToCsv(jsonData);
    // Expect the result to equal the expected CSV output
    expect(resultCsv).toEqual(expectedCsv);
  });
});
