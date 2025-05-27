// Mock the database directory creation
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

// Set test environment variables
process.env.NODE_ENV = 'test';

// Add any custom Jest setup here
Object.defineProperty(window, 'ProgressBar', {
  writable: true,
  value: require('./public/js/modules/processing/ProgressBar')
}); 