module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js'],
  moduleDirectories: ['node_modules'],
  testMatch: ['**/tests/**/*.test.js'],
  transformIgnorePatterns: [
    '/node_modules/',
  ],
}; 