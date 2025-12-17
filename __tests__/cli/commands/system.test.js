/**
 * System Command Tests
 * Task 10.1 - TDD RED Phase
 * 
 * Tests for src/cli/commands/system.js
 */

const { Command } = require('commander');
const systemCommand = require('../../../src/cli/commands/system');
const { CLIError } = require('../../../src/cli/errors');

// Mock SystemService
jest.mock('../../../src/services/SystemService', () => {
  return jest.fn().mockImplementation(() => ({
    initDb: jest.fn(),
    getStatus: jest.fn(),
    clearQueue: jest.fn()
  }));
});

describe('System Command', () => {
  let program;
  let mockConsoleLog;
  let mockConsoleError;
  let mockInitDb;
  let mockGetStatus;
  let mockClearQueue;

  beforeEach(() => {
    jest.clearAllMocks();

    program = new Command();
    program.exitOverride();
    program.configureOutput({
      writeOut: () => { },
      writeErr: () => { }
    });

    program.addCommand(systemCommand);

    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(process, 'exit').mockImplementation(() => { });

    // Setup Service Mocks
    const SystemServiceClass = require('../../../src/services/SystemService');
    mockInitDb = jest.fn();
    mockGetStatus = jest.fn();
    mockClearQueue = jest.fn();

    SystemServiceClass.mockImplementation(() => ({
      initDb: mockInitDb,
      getStatus: mockGetStatus,
      clearQueue: mockClearQueue
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const runCommand = async (args) => {
    try {
      await program.parseAsync(args, { from: 'user' });
    } catch (err) {
      if (err.code !== 'commander.exit') {
        throw err;
      }
    }
  };

  describe('init-db subcommand', () => {
    it('should call SystemService.initDb', async () => {
      mockInitDb.mockResolvedValue({ success: true, message: 'DB initialized' });

      await runCommand(['system', 'init-db']);

      expect(mockInitDb).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"success": true'));
    });
  });

  describe('status subcommand', () => {
    it('should call SystemService.getStatus', async () => {
      mockGetStatus.mockResolvedValue({ database: {}, queue: {} });

      await runCommand(['system', 'status']);

      expect(mockGetStatus).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"success": true'));
    });
  });

  describe('clear-queue subcommand', () => {
    it('should call SystemService.clearQueue with confirm=true when flag is present', async () => {
      mockClearQueue.mockResolvedValue({ success: true, cleared_count: 5 });

      await runCommand(['system', 'clear-queue', '--confirm']);

      expect(mockClearQueue).toHaveBeenCalledWith(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"success": true'));
    });

    it('should call SystemService.clearQueue with undefined/false when flag is missing', async () => {
      // The service throws if confirm is missing, so we mock rejection or check arguments
      // If the command simply passes options, it passes undefined/false.
      // Let's mock a rejection to simulate service behavior
      const error = new CLIError('CONFIRMATION_REQUIRED', 'Confirmation required');
      mockClearQueue.mockRejectedValue(error);

      await runCommand(['system', 'clear-queue']);

      expect(mockClearQueue).toHaveBeenCalledWith(undefined); // or expect.anything() if we don't care about exact value, but we do care it wasn't true
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('CONFIRMATION_REQUIRED'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Unhappy Path', () => {
    it('should handle service errors', async () => {
      const error = new CLIError('DATABASE_ERROR', 'Init failed');
      mockInitDb.mockRejectedValue(error);

      await runCommand(['system', 'init-db']);

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('DATABASE_ERROR'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
