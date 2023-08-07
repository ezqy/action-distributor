/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  collectCoverage: true,
  collectCoverageFrom: [
    "<rootDir>/src/**/*.ts",
    "!**/node_modules/**",
  ],
  setupFiles: ["<rootDir>/__tests__/data/setup.ts"],
  testMatch: ['**/*.test.ts'],
};