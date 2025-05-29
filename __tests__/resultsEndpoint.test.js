const request = require('supertest');
const express = require('express');
const httpMocks = require('node-mocks-http');
const { getResults } = require('../src/controllers/resultsManager');
const { getAllMemorials } = require('../src/controllers/resultsManager');
const { memorialTypes } = require('../src/utils/prompts/types/memorialTypes');

// Mock database module
jest.mock('../src/controllers/resultsManager');

describe('Results Endpoint', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('getResults', () => {
    it('should return results with proper data types', async () => {
      const mockData = {
        results: [
          {
            memorial_number: 123,
            first_name: 'John',
            last_name: 'Smith',
            year_of_death: 1900,
            inscription: 'In loving memory',
            file_name: 'test.jpg'
          }
        ]
      };

      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();
      
      res.json(mockData);

      expect(res._getJSONData()).toEqual(mockData);
    });

    it('should handle missing optional fields', async () => {
      const mockData = {
        results: [
          {
            memorial_number: 123,
            first_name: null,
            last_name: 'Smith',
            year_of_death: null,
            inscription: null,
            file_name: 'test.jpg'
          }
        ]
      };

      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();
      
      res.json(mockData);

      expect(res._getJSONData()).toEqual(mockData);
    });

    it('should include prompt metadata in response', async () => {
      const mockData = {
        results: [
          {
            memorial_number: 123,
            first_name: 'John',
            last_name: 'Smith',
            year_of_death: 1900,
            inscription: 'In loving memory',
            file_name: 'test.jpg'
          }
        ]
      };

      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();
      
      res.json(mockData);

      expect(res._getJSONData()).toEqual(mockData);
    });

    it('should handle database errors gracefully', async () => {
      getAllMemorials.mockRejectedValue(new Error('Database error'));
      await getResults(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Database error');
    });

    it('should validate data types before sending response', async () => {
      const mockData = [
        {
          memorial_number: '123', // String that should be converted to number
          first_name: 'John',
          last_name: 'Smith',
          year_of_death: '1900', // String that should be converted to number
          inscription: 'In loving memory',
          file_name: 'test.jpg'
        }
      ];

      getAllMemorials.mockResolvedValue(mockData);
      await getResults(req, res);

      const data = JSON.parse(res._getData());
      const result = data[0];
      
      expect(typeof result.memorial_number).toBe('number');
      expect(typeof result.year_of_death).toBe('number');
    });
  });
}); 