// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/jest.globalSetup.js',
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)', // Agar aap __tests__ folder use karna chahein
    '**/?(*.)+(spec|test).[jt]s?(x)',    // Source files ke saath .spec.ts ya .test.ts
  ],
  moduleNameMapper: {
    // Agar aap tsconfig.json mein path aliases use karte hain, toh yahan map karein
    // Example: '^@App/(.*)$': '<rootDir>/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'] // dist directory ko ignore karna zaroori hai
}; 