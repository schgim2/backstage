/**
 * Jest test setup configuration
 */

// Extend Jest matchers if needed
// import 'jest-extended';

// Set up test environment
beforeAll(() => {
  // Global test setup
});

afterAll(() => {
  // Global test cleanup
});

// Configure property-based testing
export const PROPERTY_TEST_RUNS = 100;

// Mock console methods in tests to reduce noise
const originalConsole = console;
beforeEach(() => {
  global.console = {
    ...originalConsole,
    // Uncomment to suppress console output in tests
    // log: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
});