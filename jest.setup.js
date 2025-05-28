// Mock the database directory creation
import { jest } from '@jest/globals';

// Add TextEncoder and TextDecoder to global scope
const util = await import('node:util');
global.TextEncoder = util.TextEncoder;
global.TextDecoder = util.TextDecoder;

// Mock fs module
jest.mock('fs', async () => {
  const fsMock = await import('./__mocks__/fs.js');
  return fsMock.default;
});

// Set test environment variables
process.env.NODE_ENV = 'test';