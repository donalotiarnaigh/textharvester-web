// First, declare all mocks
const mockOpenAICreateMethod = jest.fn();
const mockAnthropicCreateMethod = jest.fn();

const mockOpenAIInstance = {
  chat: {
    completions: {
      create: mockOpenAICreateMethod
    }
  }
};

const mockAnthropicInstance = {
  messages: {
    create: mockAnthropicCreateMethod
  }
};

// Then mock all modules
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAIInstance);
});

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => mockAnthropicInstance);
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

// Mock the model providers
jest.mock('../src/utils/modelProviders', () => {
  const OpenAIProvider = jest.fn().mockImplementation(() => ({
    processImage: mockOpenAICreateMethod,
    getModelVersion: () => 'gpt-5'
  }));

  const AnthropicProvider = jest.fn().mockImplementation(() => ({
    processImage: mockAnthropicCreateMethod,
    getModelVersion: () => 'claude-3-7-sonnet-20250219'
  }));

  return {
    createProvider: (config) => {
      switch (config.AI_PROVIDER.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider();
      case 'anthropic':
        return new AnthropicProvider();
      default:
        throw new Error('Invalid model selected');
      }
    },
    OpenAIProvider,
    AnthropicProvider
  };
});

// Then import modules
const fs = require('fs').promises;
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { processFile } = require('../src/utils/fileProcessing.js');
const logger = require('../src/utils/logger.js');

describe('processFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockResponse = {
      memorial_number: '123',
      first_name: 'Test',
      last_name: 'User',
      year_of_death: '2000',
      inscription: 'Test inscription'
    };

    // Mock OpenAI response format
    mockOpenAICreateMethod.mockResolvedValue(mockResponse);

    // Mock Anthropic response format
    mockAnthropicCreateMethod.mockResolvedValue(mockResponse);
  });

  it('should process file successfully with OpenAI', async () => {
    const result = await processFile('test.jpg', { provider: 'openai' });
    expect(result).toBeDefined();
    expect(result.ai_provider).toBe('openai');
    expect(result.model_version).toBe('gpt-5');
    expect(mockOpenAICreateMethod).toHaveBeenCalled();
    expect(mockAnthropicCreateMethod).not.toHaveBeenCalled();
  });

  it('should process file successfully with Anthropic', async () => {
    const result = await processFile('test.jpg', { provider: 'anthropic' });
    expect(result).toBeDefined();
    expect(result.ai_provider).toBe('anthropic');
    expect(result.model_version).toBe('claude-3-7-sonnet-20250219');
    expect(mockAnthropicCreateMethod).toHaveBeenCalled();
    expect(mockOpenAICreateMethod).not.toHaveBeenCalled();
  });

  it('should handle errors during OpenAI API call', async () => {
    mockOpenAICreateMethod.mockRejectedValueOnce(new Error('OpenAI API Error'));
    await expect(processFile('test.jpg', { provider: 'openai' }))
      .rejects
      .toThrow('OpenAI API Error');
  });

  it('should handle errors during Anthropic API call', async () => {
    mockAnthropicCreateMethod.mockRejectedValueOnce(new Error('Anthropic API Error'));
    await expect(processFile('test.jpg', { provider: 'anthropic' }))
      .rejects
      .toThrow('Anthropic API Error');
  });

  it('should handle invalid model selection', async () => {
    await expect(processFile('test.jpg', { provider: 'invalid' }))
      .rejects
      .toThrow('Invalid model selected');
  });

  it('should handle file read errors', async () => {
    fs.readFile.mockRejectedValueOnce(new Error('File read error'));
    await expect(processFile('test.jpg', { provider: 'openai' }))
      .rejects
      .toThrow('File read error');
  });

  it('should handle database storage errors', async () => {
    const storeMemorial = require('../src/utils/database').storeMemorial;
    storeMemorial.mockRejectedValueOnce(new Error('Database error'));
    await expect(processFile('test.jpg', { provider: 'openai' }))
      .rejects
      .toThrow('Database error');
  });
});
