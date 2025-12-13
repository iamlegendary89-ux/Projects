/** @type {import('jest').Config} */
export default {
  displayName: "scripts",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/scripts/**/__tests__/**/*.{js,ts}",
    "<rootDir>/scripts/**/*.{test,spec}.{js,ts}",
    "<rootDir>/tests/**/*.{js,ts}"
  ],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.json"
      }
    ]
  },
  // No setup file for scripts tests to avoid ES module issues
  // setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  collectCoverageFrom: ["scripts/**/*.{js,ts}", "!scripts/**/*.d.ts", "!**/node_modules/**"],
  coverageReporters: ["text", "html", "lcov"],
  coverageDirectory: "coverage/scripts",
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/coverage/"],
  // Extended timeout for performance tests
  testTimeout: 60000 // 60 seconds for performance tests
};
