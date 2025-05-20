const httpMocks = require('node-mocks-http');
const multer = require('multer');
const { handleFileUpload } = require('../src/controllers/uploadHandler');
const { enqueueFiles } = require('../src/utils/fileQueue');
const { clearAllMemorials } = require('../src/utils/database');
const { getPrompt } = require('../src/utils/prompts/templates/providerTemplates');
const logger = require('../src/utils/logger');

// Mock dependencies
jest.mock('multer');
jest.mock('../src/utils/fileQueue');
jest.mock('../src/utils/database');
jest.mock('../src/utils/prompts/templates/providerTemplates');
jest.mock('../src/utils/logger');
jest.mock('../src/utils/pdfConverter');

describe('Upload Handler', () => {
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock request and response
    mockReq = httpMocks.createRequest({
      method: 'POST',
      url: '/upload'
    });
    mockRes = httpMocks.createResponse();
    
    // Mock multer middleware
    multer.mockReturnValue({
      fields: () => {
        return function(req, res, next) {
          req.files = {
            file: [{
              originalname: 'test.jpg',
              path: '/uploads/test.jpg',
              mimetype: 'image/jpeg'
            }]
          };
          req.body = {
            aiProvider: req.body.aiProvider || 'openai',
            promptTemplate: req.body.promptTemplate || 'memorialOCR',
            promptVersion: req.body.promptVersion || 'latest',
            replaceExisting: req.body.replaceExisting || 'false'
          };
          next();
        };
      }
    });
    
    // Mock getPrompt
    getPrompt.mockReturnValue({
      validateTemplate: jest.fn().mockReturnValue(true),
      version: '1.0'
    });
  });

  describe('Basic Upload Functionality', () => {
    test('handles file upload with prompt configuration', async () => {
      // Setup
      const files = [{
        originalname: 'test.jpg',
        path: '/uploads/test.jpg',
        mimetype: 'image/jpeg'
      }];
      
      // Execute
      await handleFileUpload(mockReq, mockRes);
      
      // Assert
      expect(enqueueFiles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            path: '/uploads/test.jpg',
            provider: 'openai',
            promptTemplate: 'memorialOCR',
            promptVersion: 'latest'
          })
        ])
      );
      expect(mockRes._getStatusCode()).toBe(200);
    });

    test('uses default prompt settings when not specified', async () => {
      // Setup
      mockReq.body = {
        aiProvider: 'openai',
        replaceExisting: 'false'
      };
      
      // Execute
      await handleFileUpload(mockReq, mockRes);
      
      // Assert
      expect(enqueueFiles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            promptTemplate: 'memorialOCR',
            promptVersion: 'latest'
          })
        ])
      );
    });
  });

  describe('Prompt Validation', () => {
    test('validates prompt template selection', async () => {
      // Setup
      mockReq.body.promptTemplate = 'invalidTemplate';
      getPrompt.mockImplementation(() => {
        throw new Error('Invalid template');
      });
      
      // Execute
      await handleFileUpload(mockReq, mockRes);
      
      // Assert
      expect(mockRes._getStatusCode()).toBe(400);
      expect(JSON.parse(mockRes._getData())).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('Invalid template')
        })
      );
    });

    test('validates prompt version', async () => {
      // Setup
      mockReq.body.promptVersion = 'invalidVersion';
      getPrompt.mockImplementation(() => {
        throw new Error('Invalid version');
      });
      
      // Execute
      await handleFileUpload(mockReq, mockRes);
      
      // Assert
      expect(mockRes._getStatusCode()).toBe(400);
      expect(JSON.parse(mockRes._getData())).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('Invalid version')
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('handles multer errors', async () => {
      // Setup
      const multerError = new multer.MulterError('LIMIT_FILE_SIZE');
      multer.mockReturnValue({
        fields: () => {
          throw multerError;
        }
      });
      
      // Execute
      await handleFileUpload(mockReq, mockRes);
      
      // Assert
      expect(mockRes._getStatusCode()).toBe(500);
      expect(mockRes._getData()).toContain('file upload');
    });

    test('handles missing files', async () => {
      // Setup
      multer.mockReturnValue({
        fields: () => {
          return function(req, res, next) {
            req.files = {};
            next();
          };
        }
      });
      
      // Execute
      await handleFileUpload(mockReq, mockRes);
      
      // Assert
      expect(mockRes._getStatusCode()).toBe(400);
      expect(mockRes._getData()).toContain('No files uploaded');
    });
  });

  describe('File Queue Integration', () => {
    test('passes prompt info to file queue', async () => {
      // Setup
      mockReq.body = {
        aiProvider: 'anthropic',
        promptTemplate: 'customTemplate',
        promptVersion: '2.0',
        replaceExisting: 'false'
      };

      multer.mockReturnValue({
        fields: () => {
          return function(req, res, next) {
            req.files = {
              file: [{
                originalname: 'test.jpg',
                path: '/uploads/test.jpg',
                mimetype: 'image/jpeg'
              }]
            };
            req.body = mockReq.body;
            next();
          };
        }
      });

      // Execute
      await handleFileUpload(mockReq, mockRes);

      // Assert
      expect(enqueueFiles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            provider: 'anthropic',
            promptTemplate: 'customTemplate',
            promptVersion: '2.0'
          })
        ])
      );
    });
  });

  describe('Multer Middleware Configuration', () => {
    test('configures multer with correct fields option', async () => {
      // Setup
      const multerFieldsSpy = jest.fn().mockReturnValue((req, res, next) => next());
      const mockStorage = multer.diskStorage({});
      
      // Mock storage creation
      jest.spyOn(multer, 'diskStorage').mockReturnValue(mockStorage);
      
      multer.mockReturnValue({
        fields: multerFieldsSpy
      });
      
      // Execute
      await handleFileUpload(mockReq, mockRes);
      
      // Assert
      expect(multer).toHaveBeenCalledWith({
        storage: mockStorage,
        fileFilter: expect.any(Function),
        limits: expect.objectContaining({
          fileSize: 100 * 1024 * 1024 // 100MB
        })
      });
      expect(multerFieldsSpy).toHaveBeenCalledWith([
        { name: 'file', maxCount: 10 }
      ]);
    });

    test('handles file upload with fields configuration', async () => {
      // Setup
      const mockFiles = [{
        originalname: 'test.jpg',
        path: '/uploads/test.jpg',
        mimetype: 'image/jpeg'
      }];
      
      multer.mockReturnValue({
        fields: () => (req, res, next) => {
          req.files = { file: mockFiles };
          req.body = {
            aiProvider: 'openai',
            promptTemplate: 'memorialOCR',
            promptVersion: 'latest'
          };
          next();
        }
      });
      
      // Execute
      await handleFileUpload(mockReq, mockRes);
      
      // Assert
      expect(mockRes._getStatusCode()).toBe(200);
      expect(enqueueFiles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            path: '/uploads/test.jpg',
            provider: 'openai',
            promptTemplate: 'memorialOCR',
            promptVersion: 'latest'
          })
        ])
      );
    });
  });
}); 