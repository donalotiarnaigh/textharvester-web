/**
 * @jest-environment jsdom
 */

const { jsonToCsv } = require('../../src/utils/dataConversion');

describe('Data Conversion Utils', () => {
  const testData = [
    {
      memorial_number: 'MEM001',
      first_name: 'John',
      last_name: 'Doe',
      year_of_death: '1900',
      inscription: 'Rest in Peace',
      file_name: 'test1.jpg',
      ai_provider: 'openai',
      processed_date: '2025-01-01T12:00:00Z'
    },
    {
      memorial_number: 'MEM002',
      first_name: 'Jane',
      last_name: 'Smith',
      year_of_death: '1950',
      inscription: 'In loving memory,\nForever missed',
      file_name: 'test2.jpg',
      ai_provider: 'anthropic',
      processed_date: '2025-01-02T12:00:00Z'
    }
  ];

  describe('jsonToCsv', () => {
    it('should return empty string for empty input', () => {
      expect(jsonToCsv([])).toBe('');
      expect(jsonToCsv(null)).toBe('');
      expect(jsonToCsv(undefined)).toBe('');
    });

    it('should convert JSON data to CSV format with headers', () => {
      const csv = jsonToCsv(testData);
      const lines = csv.split('\n');
      
      // Check headers
      expect(lines[0]).toBe('memorial_number,first_name,last_name,year_of_death,inscription,file_name,ai_provider,processed_date');
      
      // Check first data row
      expect(lines[1]).toBe('MEM001,John,Doe,1900,Rest in Peace,test1.jpg,openai,2025-01-01T12:00:00Z');
    });

    it('should properly escape fields containing commas', () => {
      const dataWithCommas = [{
        memorial_number: 'MEM003',
        first_name: 'Smith, John',
        last_name: 'Doe',
        inscription: 'Rest, in Peace',
        processed_date: '2025-01-03T12:00:00Z'
      }];

      const csv = jsonToCsv(dataWithCommas);
      const dataLine = csv.split('\n')[1];
      
      expect(dataLine).toContain('"Smith, John"');
      expect(dataLine).toContain('"Rest, in Peace"');
    });

    it('should properly handle newlines in fields', () => {
      const csv = jsonToCsv(testData);
      const lines = csv.split('\n');
      const secondRow = lines[2]; // Get the second data row
      
      // The field should be properly quoted and contain the literal \n string
      expect(secondRow).toContain('"In loving memory,\\nForever missed"');
    });

    it('should handle missing fields gracefully', () => {
      const incompleteData = [{
        memorial_number: 'MEM004',
        first_name: 'John'
        // Other fields missing
      }];

      const csv = jsonToCsv(incompleteData);
      const dataLine = csv.split('\n')[1];
      
      expect(dataLine).toBe('MEM004,John,,,,,,');
    });

    it('should properly escape quotes in fields', () => {
      const dataWithQuotes = [{
        memorial_number: 'MEM005',
        first_name: 'John "Johnny"',
        inscription: 'He said "goodbye"',
        processed_date: '2025-01-05T12:00:00Z'
      }];

      const csv = jsonToCsv(dataWithQuotes);
      const dataLine = csv.split('\n')[1];
      
      expect(dataLine).toContain('"John ""Johnny"""');
      expect(dataLine).toContain('"He said ""goodbye"""');
    });
  });
}); 