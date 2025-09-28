jest.mock('../src/utils/fileProcessing', () => ({
  processFile: jest.fn()
}));
jest.mock('../src/utils/logger');
jest.mock('../../config.json', () => ({
  uploadPath: '/tmp/uploads',
  maxRetryCount: 3,
  upload: {
    retryDelaySeconds: 0
  },
  processingCompleteFlagPath: '/tmp/flag'
}), { virtual: true });

const fs = require('fs');
const path = require('path');
const { enqueueFiles, getProcessedResults } = require('../src/utils/fileQueue');
const { processFile } = require('../src/utils/fileProcessing');

describe('fileQueue parallel processing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (!fs.existsSync('/tmp/uploads')) {
      fs.mkdirSync('/tmp/uploads', { recursive: true });
    }
  });

  afterEach(() => {
    jest.resetModules();
  });

  test('passes providers array to processFile for parallel jobs', async () => {
    processFile.mockResolvedValue({
      fileName: 'test.jpg',
      providers: {
        openai: { status: 'success' },
        anthropic: { status: 'success' }
      }
    });

    enqueueFiles([
      {
        path: path.join('/tmp/uploads', 'test.jpg'),
        providers: ['openai', 'anthropic'],
        promptTemplate: 'memorialOCR',
        promptVersion: 'latest'
      }
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(processFile).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      providers: ['openai', 'anthropic'],
      promptTemplate: 'memorialOCR',
      promptVersion: 'latest'
    }));

    const results = getProcessedResults();
    expect(results[0].providers.openai.status).toBe('success');
  });
});
