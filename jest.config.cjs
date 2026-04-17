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
  reporters: ['default', 'jest-junit'],
  testRunner: 'jest-circus/runner',
  verbose: true,
  testTimeout: 30000,
  coverageThreshold: {
    global: {
      statements: 68,
      branches: 59,
      functions: 71,
      lines: 69
    }
  }
}; 