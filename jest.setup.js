// Mock the database directory creation
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

// Set test environment variables
process.env.NODE_ENV = 'test'; 