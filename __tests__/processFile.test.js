// First, declare all mocks
const mockCreateMethod = jest.fn();
const mockOpenAIInstance = {
  chat: {
    completions: {
      create: mockCreateMethod
    }
  }
};

// Then mock all modules
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAIInstance);
});

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue('base64imagestring'),
    unlink: jest.fn().mockResolvedValue(undefined)
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

jest.mock('../src/utils/logger');
jest.mock('../src/utils/database', () => ({
  storeMemorial: jest.fn().mockResolvedValue(true)
}));

// Then import modules
const fs = require('fs').promises;
const OpenAI = require('openai');
const { processFile } = require('../src/utils/fileProcessing.js');
const logger = require('../src/utils/logger.js');

describe('processFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMethod.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            memorial_number: '123',
            first_name: 'Test',
            last_name: 'User'
          })
        }
      }]
    });
  });

  it('should process file successfully', async () => {
    const result = await processFile('test.jpg');
    expect(result).toBeDefined();
    expect(mockCreateMethod).toHaveBeenCalled();
  });

  it('should handle errors during API call', async () => {
    mockCreateMethod.mockRejectedValueOnce(new Error('API Error'));
    await expect(processFile('test.jpg')).rejects.toThrow('API Error');
  });
});
