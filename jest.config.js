module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'mobile/**/*.{ts,tsx}',
    'backend/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
