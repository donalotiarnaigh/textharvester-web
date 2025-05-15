// Mock the database directory creation
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock window.location
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { href: '' }
  });
}

// Mock fs module
import { jest } from '@jest/globals';
import fs from 'fs';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
})); 