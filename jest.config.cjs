module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.json' }]
  },
  moduleFileExtensions: ['js', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.js?(x)', '**/?(*.)+(spec|test).js?(x)'],
  transformIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },
  moduleNameMapper: {
    '^../../../src/utils/logger$': '<rootDir>/__mocks__/logger.js',
    '^../../src/utils/logger$': '<rootDir>/__mocks__/logger.js',
    '^../src/utils/logger$': '<rootDir>/__mocks__/logger.js',
    '^/js/(.*)$': '<rootDir>/public/js/$1'
  },
  testRunner: 'jest-circus/runner',
  verbose: true
}; 