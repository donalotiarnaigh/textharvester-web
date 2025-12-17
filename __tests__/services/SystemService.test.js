const SystemService = require('../../src/services/SystemService');
const { CLIError } = require('../../src/cli/errors');
const database = require('../../src/utils/database');
const fileQueue = require('../../src/utils/fileQueue');
const logger = require('../../src/utils/logger');
const burialRegisterStorage = require('../../src/utils/burialRegisterStorage');
const graveCardStorage = require('../../src/utils/graveCardStorage');

// Mock dependencies
jest.mock('../../src/utils/database');
jest.mock('../../src/utils/fileQueue');
jest.mock('../../src/utils/logger');
jest.mock('../../src/utils/burialRegisterStorage');
jest.mock('../../src/utils/graveCardStorage');

describe('SystemService', () => {
  let service;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig = {
      dbPath: './data/test.db'
    };
    service = new SystemService(mockConfig);
  });

  describe('initDb', () => {
    it('should initialize database successfully', async () => {
      // Setup successful mock responses
      // Note: in the real implementation, these are void functions that log errors if they fail
      // but we assume they might throw or we check if they were called

      const result = await service.initDb();

      expect(result).toEqual({ success: true, message: 'Database initialized successfully' });
      // Depending on implementation, it might call specific init functions from database.js
      // We'll verify generalized behavior here or specific calls if we know them
      // Based on design, it should call init helpers
    });

    it('should handle initialization errors', async () => {
      // Mock an error in initialization
      // We assume SystemService calls existing init functions that might throw or we'd wrap them
      // For this test, let's assume we mock a database module method that throws
      database.initializeDatabase = jest.fn().mockImplementation(() => { throw new Error('Permission denied'); });

      await expect(service.initDb())
        .rejects
        .toThrow(); // Expecting it to propagate or wrap error

      // Or if we expect specific CLIError:
      // await expect(service.initDb()).rejects.toThrow(CLIError);
    });
  });


  describe('getStatus', () => {
    it('should return system status with queue and db counts', async () => {
      // Mock queue status
      fileQueue.getProcessingProgress.mockReturnValue({
        queue: { size: 5, pending: 2, processing: 3 }
      });

      // Mock db counts
      database.getAllMemorials.mockResolvedValue([1, 2, 3]); // length 3
      burialRegisterStorage.getAllBurialRegisterEntries.mockResolvedValue([1]); // length 1
      graveCardStorage.getAllGraveCards.mockResolvedValue([1, 2]); // length 2

      // Mock timestamp
      const now = new Date().toISOString();

      const status = await service.getStatus();

      expect(status).toHaveProperty('queue');
      expect(status).toHaveProperty('database');
      expect(status.queue.pending).toBe(5);
      expect(status.database.records.memorial).toBe(3);
      expect(status.database.records.burial_register).toBe(1);
      expect(status.database.records.grave_record_card).toBe(2);
    });
  });

  describe('clearQueue', () => {
    it('should clear queue when confirmed', async () => {
      fileQueue.cancelProcessing.mockImplementation(() => { });
      fileQueue.getTotalFiles.mockReturnValue(0);

      const result = await service.clearQueue(true);

      expect(fileQueue.cancelProcessing).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Queue cleared');
    });

    it('should throw error when confirmation missing', async () => {
      await expect(service.clearQueue(false))
        .rejects
        .toThrow('Destructive operation requires --confirm flag');

      try {
        await service.clearQueue(false);
      } catch (error) {
        expect(error).toBeInstanceOf(CLIError);
        expect(error.code).toBe('CONFIRMATION_REQUIRED');
      }

      expect(fileQueue.cancelProcessing).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should close database connection', async () => {
      const mockClose = jest.fn((cb) => cb());
      database.db = { close: mockClose };

      await service.cleanup();

      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle errors during cleanup', async () => {
      const mockClose = jest.fn((cb) => cb(new Error('Close failed')));
      database.db = { close: mockClose };

      // Should not throw
      await service.cleanup();

      expect(mockClose).toHaveBeenCalled();
    });
  });
});
