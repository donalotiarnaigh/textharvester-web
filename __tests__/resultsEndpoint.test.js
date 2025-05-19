const httpMocks = require('node-mocks-http');
const { getResults } = require('../src/controllers/resultsManager');
const { getAllMemorials } = require('../src/utils/database');
const { memorialTypes } = require('../src/utils/prompts/types/memorialTypes');

// Mock database module
jest.mock('../src/utils/database', () => ({
  getAllMemorials: jest.fn()
}));

describe('Results Endpoint', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('getResults', () => {
    it('should return results with proper data types', async () => {
      const mockData = [
        {
          id: 1,
          memorial_number: 123,
          first_name: 'John',
          last_name: 'Doe',
          year_of_death: 1900,
          inscription: 'Test inscription',
          file_name: 'test.jpg',
          ai_provider: 'openai',
          model_version: 'gpt-4o',
          prompt_version: '1.0.0',
          processed_date: '2024-03-20T10:00:00.000Z'
        }
      ];

      getAllMemorials.mockResolvedValue(mockData);
      await getResults(req, res);

      const data = JSON.parse(res._getData());
      expect(res._getStatusCode()).toBe(200);
      expect(data).toHaveLength(1);

      const result = data[0];
      // Verify data types match schema
      expect(typeof result.memorial_number).toBe('number');
      expect(typeof result.first_name).toBe('string');
      expect(typeof result.last_name).toBe('string');
      expect(typeof result.year_of_death).toBe('number');
      expect(typeof result.inscription).toBe('string');
      expect(typeof result.prompt_version).toBe('string');
    });

    it('should handle missing optional fields', async () => {
      const mockData = [
        {
          id: 1,
          memorial_number: null,
          first_name: null,
          last_name: 'Doe',
          year_of_death: null,
          inscription: '',
          file_name: 'test.jpg',
          processed_date: '2024-03-20T10:00:00.000Z'
        }
      ];

      getAllMemorials.mockResolvedValue(mockData);
      await getResults(req, res);

      const data = JSON.parse(res._getData());
      expect(res._getStatusCode()).toBe(200);
      expect(data).toHaveLength(1);

      const result = data[0];
      expect(result.memorial_number).toBeNull();
      expect(result.first_name).toBeNull();
      expect(result.year_of_death).toBeNull();
      expect(result.inscription).toBe('');
    });

    it('should include prompt metadata in response', async () => {
      const mockData = [
        {
          id: 1,
          memorial_number: 123,
          first_name: 'John',
          last_name: 'Doe',
          file_name: 'test.jpg',
          ai_provider: 'anthropic',
          model_version: 'claude-3',
          prompt_version: '2.0.0',
          processed_date: '2024-03-20T10:00:00.000Z'
        }
      ];

      getAllMemorials.mockResolvedValue(mockData);
      await getResults(req, res);

      const data = JSON.parse(res._getData());
      const result = data[0];
      
      expect(result.ai_provider).toBe('anthropic');
      expect(result.model_version).toBe('claude-3');
      expect(result.prompt_version).toBe('2.0.0');
    });

    it('should handle database errors gracefully', async () => {
      getAllMemorials.mockRejectedValue(new Error('Database error'));
      await getResults(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error', 'Failed to retrieve results');
    });

    it('should validate data types before sending response', async () => {
      const mockData = [
        {
          id: 1,
          memorial_number: '123', // String instead of number
          first_name: 'John',
          last_name: 'Doe',
          year_of_death: '1900', // String instead of number
          file_name: 'test.jpg',
          processed_date: '2024-03-20T10:00:00.000Z'
        }
      ];

      getAllMemorials.mockResolvedValue(mockData);
      await getResults(req, res);

      const data = JSON.parse(res._getData());
      const result = data[0];
      
      // Should be converted to proper types
      expect(typeof result.memorial_number).toBe('number');
      expect(typeof result.year_of_death).toBe('number');
    });
  });
}); 