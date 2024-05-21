const fs = require('fs');
const logger = require('../src/utils/logger.js');
const { clearProcessingCompleteFlag } = require('../src/utils/processingFlag');
const config = require('../config.json');

jest.mock('fs');
jest.mock('../src/utils/logger.js');

describe('clearProcessingCompleteFlag', () => {
  const flagPath = config.processingCompleteFlagPath;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should delete the flag file if it exists', () => {
    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockImplementation(() => {});

    clearProcessingCompleteFlag();

    expect(fs.existsSync).toHaveBeenCalledWith(flagPath);
    expect(fs.unlinkSync).toHaveBeenCalledWith(flagPath);
    expect(logger.info).toHaveBeenCalledWith(
      'Cleared existing processing completion flag.'
    );
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
