const { jsonToCsv } = require('../src/utils/dataConversion');

describe('jsonToCsv', () => {
  it('converts JSON to CSV format with the correct columns', () => {
    const jsonData = [
      {
        memorial_number: '001',
        first_name: 'John',
        last_name: 'Doe',
        year_of_death: '1990',
        inscription: 'Rest In Peace',
        file_name: 'test1.jpg',
        processed_date: '2024-03-05'
      },
      {
        memorial_number: '002',
        first_name: 'Jane',
        last_name: 'Smith',
        year_of_death: '1995',
        inscription: 'Forever Remembered',
        file_name: 'test2.jpg',
        processed_date: '2024-03-05'
      }
    ];

    const expectedCsv = 
      'memorial_number,first_name,last_name,year_of_death,inscription,file_name,processed_date\n' +
      '001,John,Doe,1990,Rest In Peace,test1.jpg,2024-03-05\n' +
      '002,Jane,Smith,1995,Forever Remembered,test2.jpg,2024-03-05\n';

    const resultCsv = jsonToCsv(jsonData);
    expect(resultCsv).toEqual(expectedCsv);
  });
});
