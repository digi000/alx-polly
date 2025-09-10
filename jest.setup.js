// Jest setup file for poll actions testing
// This file is referenced in jest.config.js

// Mock Next.js modules that are not available in test environment
global.console = {
  ...console,
  // uncomment to ignore a specific log level
  log: jest.fn(),
  error: jest.fn(),
}

// Mock fetch for any API calls
global.fetch = jest.fn()

// Mock environment variables if needed
process.env.NODE_ENV = 'test'
