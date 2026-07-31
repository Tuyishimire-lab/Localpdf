import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customConfig = {
  // Use jsdom for component/API tests; individual test files can override with
  // @jest-environment node for pure Node tests (e.g. blog.test.js)
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Resolve src/ path alias used in the app
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Only look inside __tests__
  testMatch: ['**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)'],

  // Coverage
  collectCoverageFrom: [
    'src/lib/**/*.js',
    'src/app/api/**/*.js',
    'src/app/components/ToolErrorBoundary.js',
    '!src/**/*.d.ts',
  ],
};

export default createJestConfig(customConfig);
