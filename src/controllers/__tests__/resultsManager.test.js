const { 
  getResults, 
  downloadResultsJSON, 
  downloadResultsCSV 
} = require('../resultsManager');
const { getProcessedResults } = require('../../utils/fileQueue');
const { getAllMemorials } = require('../../utils/database');
const { validateAndConvertRecords } = require('../../utils/dataValidation');

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../../utils/fileQueue', () => ({
  getProcessedResults: jest.fn()
}));

jest.mock('../../utils/database', () => ({
  getAllMemorials: jest.fn()
}));

jest.mock('../../utils/dataValidation', () => ({
  validateAndConvertRecords: jest.fn(data => data) // Return the same data
}));

jest.mock('../../utils/dataConversion', () => ({
  jsonToCsv: jest.fn(() => 'csv-data'),
  formatJsonForExport: jest.fn(() => 'json-data')
}));

jest.mock('moment', () => () => ({ 
  format: () => '20250522_103213' 
}));

describe('Enhanced Results Manager with Error Handling', () => {
  let mockResponse;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock response object
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      setHeader: jest.fn(),
      attachment: jest.fn().mockReturnThis(),
      end: jest.fn()
    };
  });
  
  describe('getResults', () => {
    it('should return both memorials and errors', async () => {
      // Mock processed results with both successful and error records
      const mockResults = [
        {
          memorial_number: 'HG-123',
          first_name: 'JOHN',
          last_name: 'DOE',
          fileName: 'file1.jpg'
        },
        {
          fileName: 'file2.jpg',
          error: true,
          errorType: 'empty_sheet',
          errorMessage: 'No readable text found on the sheet'
        }
      ];
      
      getAllMemorials.mockResolvedValue([mockResults[0]]);
      getProcessedResults.mockReturnValue(mockResults);
      
      await getResults({}, mockResponse);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        memorials: [mockResults[0]],
        errors: [mockResults[1]]
      });
    });
    
    it('should handle case with no errors', async () => {
      // Mock processed results with only successful records
      const mockResults = [
        {
          memorial_number: 'HG-123',
          first_name: 'JOHN',
          last_name: 'DOE',
          fileName: 'file1.jpg'
        },
        {
          memorial_number: 'HG-124',
          first_name: 'JANE',
          last_name: 'DOE',
          fileName: 'file2.jpg'
        }
      ];
      
      getAllMemorials.mockResolvedValue(mockResults);
      getProcessedResults.mockReturnValue(mockResults);
      
      await getResults({}, mockResponse);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        memorials: mockResults,
        errors: []
      });
    });
    
    it('should handle case with only errors', async () => {
      // Mock processed results with only error records
      const mockResults = [
        {
          fileName: 'file1.jpg',
          error: true,
          errorType: 'empty_sheet',
          errorMessage: 'No readable text found on the sheet'
        },
        {
          fileName: 'file2.jpg',
          error: true,
          errorType: 'empty_sheet',
          errorMessage: 'Empty data received from OCR processing'
        }
      ];
      
      getAllMemorials.mockResolvedValue([]);
      getProcessedResults.mockReturnValue(mockResults);
      
      await getResults({}, mockResponse);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        memorials: [],
        errors: mockResults
      });
    });
  });
  
  describe('downloadResultsJSON', () => {
    it('should include only memorials in JSON download', async () => {
      // Mock processed results with both successful and error records
      const mockResults = [
        {
          memorial_number: 'HG-123',
          first_name: 'JOHN',
          last_name: 'DOE',
          fileName: 'file1.jpg'
        },
        {
          fileName: 'file2.jpg',
          error: true,
          errorType: 'empty_sheet',
          errorMessage: 'No readable text found on the sheet'
        }
      ];
      
      getAllMemorials.mockResolvedValue([mockResults[0]]);
      
      await downloadResultsJSON({ query: {} }, mockResponse);
      
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockResponse.send).toHaveBeenCalledWith('json-data');
    });
  });
}); 