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
        processed_date: '2024-03-05',
        ai_provider: 'openai',
        model_version: 'gpt-4o',
        prompt_version: '1.0'
      },
      {
        memorial_number: '002',
        first_name: 'Jane',
        last_name: 'Smith',
        year_of_death: '1995',
        inscription: 'Forever Remembered',
        file_name: 'test2.jpg',
        processed_date: '2024-03-05',
        ai_provider: 'anthropic',
        model_version: 'claude-3-7-sonnet-20250219',
        prompt_version: '1.0'
      }
    ];

    const expectedCsv = 
      'memorial_number,first_name,last_name,year_of_death,inscription,file_name,ai_provider,model_version,prompt_version,processed_date\n' +
      '001,John,Doe,1990,Rest In Peace,test1.jpg,openai,gpt-4o,1.0,2024-03-05\n' +
      '002,Jane,Smith,1995,Forever Remembered,test2.jpg,anthropic,claude-3-7-sonnet-20250219,1.0,2024-03-05\n';

    const resultCsv = jsonToCsv(jsonData);
    expect(resultCsv).toEqual(expectedCsv);
  });

  it('handles empty input', () => {
    expect(jsonToCsv([])).toBe('');
    expect(jsonToCsv(null)).toBe('');
    expect(jsonToCsv(undefined)).toBe('');
  });

  it('handles missing fields', () => {
    const jsonData = [
      {
        memorial_number: '001',
        first_name: 'John',
        // last_name missing
        year_of_death: '1990',
        inscription: 'Rest In Peace',
        file_name: 'test1.jpg',
        processed_date: '2024-03-05',
        ai_provider: 'openai'
        // model_version and prompt_version missing
      }
    ];

    const expectedCsv = 
      'memorial_number,first_name,last_name,year_of_death,inscription,file_name,ai_provider,model_version,prompt_version,processed_date\n' +
      '001,John,,1990,Rest In Peace,test1.jpg,openai,,,2024-03-05\n';

    const resultCsv = jsonToCsv(jsonData);
    expect(resultCsv).toEqual(expectedCsv);
  });

  it('escapes special characters in fields', () => {
    const jsonData = [
      {
        memorial_number: '001',
        first_name: 'John, Jr.',
        last_name: 'Doe',
        year_of_death: '1990',
        inscription: 'Rest, In Peace',
        file_name: 'test1.jpg',
        processed_date: '2024-03-05',
        ai_provider: 'openai',
        model_version: 'gpt-4o',
        prompt_version: '1.0'
      }
    ];

    const expectedCsv = 
      'memorial_number,first_name,last_name,year_of_death,inscription,file_name,ai_provider,model_version,prompt_version,processed_date\n' +
      '001,"John, Jr.",Doe,1990,"Rest, In Peace",test1.jpg,openai,gpt-4o,1.0,2024-03-05\n';

    const resultCsv = jsonToCsv(jsonData);
    expect(resultCsv).toEqual(expectedCsv);
  });
});
