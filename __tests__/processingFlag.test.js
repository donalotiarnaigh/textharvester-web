const fs = require('fs');
const { clearProcessingCompleteFlag } = require('../src/utils/processingFlag');
const logger = require('../src/utils/logger');
const config = require('../config.json');

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn()
}));

jest.mock('../src/utils/logger');

describe('clearProcessingCompleteFlag', () => {
  const flagPath = config.processingCompleteFlagPath;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete the flag file if it exists', () => {
    fs.existsSync.mockReturnValue(true);
    clearProcessingCompleteFlag();
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('processing_complete.flag'));
  });

  it('should do nothing if the flag file does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    clearProcessingCompleteFlag();

    expect(fs.existsSync).toHaveBeenCalledWith(flagPath);
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('should log an error if there is a problem deleting the flag file', () => {
    const error = new Error('Failed to delete');
    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockImplementation(() => {
      throw error;
    });

    clearProcessingCompleteFlag();

    expect(fs.unlinkSync).toHaveBeenCalledWith(flagPath);
    expect(logger.error).toHaveBeenCalledWith(
      'Error clearing processing completion flag:',
      error
    );
  });
});
