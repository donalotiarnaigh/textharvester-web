const httpMocks = require('node-mocks-http');
const { downloadResultsJSON, downloadResultsCSV } = require('../src/controllers/resultsManager');
const { getAllMemorials } = require('../src/utils/database');
const { jsonToCsv } = require('../src/utils/dataConversion');

// Mock database module
jest.mock('../src/utils/database', () => ({
  getAllMemorials: jest.fn()
}));

describe('Download Functionality', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('JSON Downloads', () => {
    it('should include prompt metadata in JSON export', async () => {
      const mockData = [{
        id: 1,
        memorial_number: 123,
        first_name: 'John',
        last_name: 'Doe',
        year_of_death: 1900,
        inscription: 'Test inscription',
        file_name: 'test.jpg',
        ai_provider: 'openai',
        model_version: 'gpt-5-2025-08-07',
        prompt_version: '1.0.0',
        processed_date: '2024-03-20T10:00:00.000Z'
      }];

      getAllMemorials.mockResolvedValue(mockData);
      await downloadResultsJSON(req, res);

      const data = JSON.parse(res._getData());
      expect(data[0]).toHaveProperty('ai_provider', 'openai');
      expect(data[0]).toHaveProperty('model_version', 'gpt-5-2025-08-07');
      expect(data[0]).toHaveProperty('prompt_version', '1.0.0');
    });

    it('should handle format option for JSON export', async () => {
      const mockData = [{
        id: 1,
        memorial_number: 123,
        first_name: 'John',
        last_name: 'Doe'
      }];

      getAllMemorials.mockResolvedValue(mockData);
      
      // Test pretty print format
      req.query.format = 'pretty';
      await downloadResultsJSON(req, res);
      expect(res._getData()).toBe(JSON.stringify(mockData, null, 2));

      // Test compact format
      res = httpMocks.createResponse();
      req.query.format = 'compact';
      await downloadResultsJSON(req, res);
      expect(res._getData()).toBe(JSON.stringify(mockData));
    });

    it('should validate data types in JSON export', async () => {
      const mockData = [{
        memorial_number: '123', // String that should be number
        year_of_death: '1900', // String that should be number
        first_name: 'John'
      }];

      getAllMemorials.mockResolvedValue(mockData);
      await downloadResultsJSON(req, res);

      const data = JSON.parse(res._getData());
      expect(typeof data[0].memorial_number).toBe('number');
      expect(typeof data[0].year_of_death).toBe('number');
    });
  });

  describe('CSV Downloads', () => {
    it('should include all fields in CSV export', async () => {
      const mockData = [{
        id: 1,
        memorial_number: 123,
        first_name: 'John',
        last_name: 'Doe',
        year_of_death: 1900,
        inscription: 'Test inscription',
        file_name: 'test.jpg',
        ai_provider: 'openai',
        model_version: 'gpt-5-2025-08-07',
        prompt_version: '1.0.0',
        processed_date: '2024-03-20T10:00:00.000Z'
      }];

      getAllMemorials.mockResolvedValue(mockData);
      await downloadResultsCSV(req, res);

      const csvData = res._getData();
      const headers = csvData.split('\n')[0];
      
      expect(headers).toContain('memorial_number');
      expect(headers).toContain('first_name');
      expect(headers).toContain('last_name');
      expect(headers).toContain('year_of_death');
      expect(headers).toContain('inscription');
      expect(headers).toContain('ai_provider');
      expect(headers).toContain('model_version');
      expect(headers).toContain('prompt_version');
    });

    it('should handle special characters in CSV export', async () => {
      const mockData = [{
        memorial_number: 123,
        first_name: 'John, Jr.', // Contains comma
        last_name: 'O"Brien', // Contains quote
        inscription: 'Line 1\nLine 2' // Contains newline
      }];

      getAllMemorials.mockResolvedValue(mockData);
      await downloadResultsCSV(req, res);

      const csvData = res._getData();
      const dataRow = csvData.split('\n')[1];
      
      expect(dataRow).toContain('"John, Jr."'); // Quoted due to comma
      expect(dataRow).toContain('"O""Brien"'); // Escaped quote
      expect(dataRow).toContain('"Line 1\\nLine 2"'); // Escaped newline
    });

    it('should validate data types in CSV export', async () => {
      const mockData = [{
        memorial_number: '123', // String that should be number
        year_of_death: '1900', // String that should be number
        first_name: 'John'
      }];

      getAllMemorials.mockResolvedValue(mockData);
      await downloadResultsCSV(req, res);

      const csvData = res._getData();
      const dataRow = csvData.split('\n')[1].split(',');
      
      expect(dataRow[0]).toBe('123'); // Should be converted to number before CSV conversion
      expect(dataRow[3]).toBe('1900'); // Should be converted to number before CSV conversion
    });

    it('should handle missing fields in CSV export', async () => {
      const mockData = [{
        memorial_number: 123,
        // first_name missing
        last_name: 'Doe'
      }];

      getAllMemorials.mockResolvedValue(mockData);
      await downloadResultsCSV(req, res);

      const csvData = res._getData();
      const dataRow = csvData.split('\n')[1].split(',');
      
      // Should have empty string for missing fields
      expect(dataRow[1]).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      getAllMemorials.mockRejectedValue(new Error('Database error'));
      
      await downloadResultsJSON(req, res);
      expect(res._getStatusCode()).toBe(500);
      expect(res._getData()).toBe('Unable to download results');

      res = httpMocks.createResponse();
      await downloadResultsCSV(req, res);
      expect(res._getStatusCode()).toBe(500);
      expect(res._getData()).toBe('Unable to download results');
    });

    it('should handle invalid format options', async () => {
      const mockData = [{ id: 1 }];
      getAllMemorials.mockResolvedValue(mockData);
      
      req.query.format = 'invalid';
      await downloadResultsJSON(req, res);
      
      // Should default to compact format
      expect(res._getData()).toBe(JSON.stringify(mockData));
    });
  });
}); 