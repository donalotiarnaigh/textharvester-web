const { jsonToCsv } = require('../src/utils/dataConversion');

describe('jsonToCsv', () => {
  it('converts JSON to CSV format with the correct columns', () => {
    // Adjust the structure for your test data to include the new fields
    const jsonData = [
      {
        memorial_number: '001',
        first_name: 'John',
        last_name: 'Doe',
        year_of_death: '1990',
        inscription: 'Rest In Peace',
      },
      {
        memorial_number: '002',
        first_name: 'Jane',
        last_name: 'Smith',
        year_of_death: '1995',
        inscription: 'Forever Remembered',
      },
    ];
    // Define the expected CSV output including the new fields in the correct order
    const expectedCsv =
      'memorial_number,first_name,last_name,year_of_death,inscription\n' +
      '001,"John","Doe","1990","Rest In Peace"\n' +
      '002,"Jane","Smith","1995","Forever Remembered"\n';

    // Call the jsonToCsv function with the test data
    const resultCsv = jsonToCsv(jsonData);
    // Expect the result to equal the expected CSV output
    expect(resultCsv).toEqual(expectedCsv);
  });
});
