const request = require('supertest');
const express = require('express');
const httpMocks = require('node-mocks-http');
const { getResults } = require('../src/controllers/resultsManager');
const { memorialTypes } = require('../src/utils/prompts/types/memorialTypes');

// Mock database module where getAllMemorials is actually defined
jest.mock('../src/utils/database');
jest.mock('../src/utils/fileQueue.js');

const { getAllMemorials, getAllParallelMemorials } = require('../src/utils/database');
const { getProcessedResults } = require('../src/utils/fileQueue.js');

describe('Results Endpoint', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();

    // Mock getProcessedResults to return no errors by default
    getProcessedResults.mockReturnValue([]);
    getAllParallelMemorials.mockResolvedValue([]);
  });

  describe('getResults', () => {
    it('should return results with proper data types', async () => {
      const mockDbResults = [
        {
          memorial_number: 123,
          first_name: 'John',
          last_name: 'Smith',
          year_of_death: 1900,
          inscription: 'In loving memory',
          file_name: 'test.jpg'
        }
      ];

      getAllMemorials.mockResolvedValue(mockDbResults);
      
      // Mock res methods to be chainable
      res.json = jest.fn().mockReturnValue(res);
      
      await getResults(req, res);

      expect(getAllMemorials).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      
      // Check the response structure
      const responseData = res.json.mock.calls[0][0];
      expect(responseData).toHaveProperty('memorials');
      expect(responseData).toHaveProperty('errors');
      expect(Array.isArray(responseData.memorials)).toBe(true);
    });

    it('returns combined provider data when parallel OCR is enabled', async () => {
      process.env.PARALLEL_OCR = 'true';
      const mockParallelResults = [
        {
          file_name: 'test.jpg',
          prompt_template: 'memorialOCR',
          prompt_version: '1.0',
          openai_first_name: 'John',
          openai_last_name: 'Smith',
          openai_memorial_number: 'O-1',
          openai_status: 'success',
          anthropic_first_name: 'Jon',
          anthropic_last_name: 'Smyth',
          anthropic_memorial_number: 'A-1',
          anthropic_status: 'error',
          anthropic_error_message: 'timeout'
        }
      ];

      getAllParallelMemorials.mockResolvedValue(mockParallelResults);
      res.json = jest.fn().mockReturnValue(res);

      await getResults(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(getAllParallelMemorials).toHaveBeenCalled();
      expect(responseData.memorials[0].openai.first_name).toBe('John');
      expect(responseData.memorials[0].anthropic.status).toBe('error');
      delete process.env.PARALLEL_OCR;
    });

    it('should handle missing optional fields', async () => {
      const mockDbResults = [
        {
          memorial_number: 123,
          first_name: null,
          last_name: 'Smith',
          year_of_death: null,
          inscription: null,
          file_name: 'test.jpg'
        }
      ];

      getAllMemorials.mockResolvedValue(mockDbResults);
      res.json = jest.fn().mockReturnValue(res);
      
      await getResults(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.memorials[0].first_name).toBeNull();
      expect(responseData.memorials[0].year_of_death).toBeNull();
      expect(responseData.memorials[0].inscription).toBeNull();
    });

    it('should include error information in response', async () => {
      const mockDbResults = [
        {
          memorial_number: 123,
          first_name: 'John',
          last_name: 'Smith',
          year_of_death: 1900,
          inscription: 'In loving memory',
          file_name: 'test.jpg'
        }
      ];

      const mockErrors = [
        { error: 'File processing error', fileName: 'error_file.jpg' }
      ];

      getAllMemorials.mockResolvedValue(mockDbResults);
      getProcessedResults.mockReturnValue(mockErrors);
      res.json = jest.fn().mockReturnValue(res);
      
      await getResults(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.errors).toEqual(mockErrors);
    });

    it('should handle database errors gracefully', async () => {
      getAllMemorials.mockRejectedValue(new Error('Database error'));
      
      // Mock res.status and res.json to be chainable
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      
      await getResults(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve results'
      });
    });

    it('should validate and convert data types before sending response', async () => {
      const mockDbResults = [
        {
          memorial_number: '123', // String that should be converted to number
          first_name: 'John',
          last_name: 'Smith',
          year_of_death: '1900', // String that should be converted to number
          inscription: 'In loving memory',
          file_name: 'test.jpg'
        }
      ];

      getAllMemorials.mockResolvedValue(mockDbResults);
      res.json = jest.fn().mockReturnValue(res);
      
      await getResults(req, res);

      expect(getAllMemorials).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      
      // Get the actual response data
      const responseData = res.json.mock.calls[0][0];
      
      // Verify data types are converted properly in the memorials array
      expect(responseData.memorials).toBeDefined();
      expect(Array.isArray(responseData.memorials)).toBe(true);
      expect(responseData.memorials.length).toBeGreaterThan(0);
      
      const result = responseData.memorials[0];
      expect(typeof result.memorial_number).toBe('number');
      expect(typeof result.year_of_death).toBe('number');
    });
  });
}); 