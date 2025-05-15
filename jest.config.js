module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js'],
  moduleDirectories: ['node_modules'],
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  setupFiles: [
    '<rootDir>/jest.setup.js'
  ],
  moduleNameMapper: {
    'sqlite3': '<rootDir>/__mocks__/sqlite3.js'
  }
}; 