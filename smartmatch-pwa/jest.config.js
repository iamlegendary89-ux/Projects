import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./"
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  collectCoverageFrom: ["scripts/**/*.{js,ts}", "!**/node_modules/**", "!**/*.d.ts"],
  coverageReporters: ["text", "html", "lcov"],
  coverageDirectory: "coverage",
  testMatch: ["<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}", "<rootDir>/**/*.{test,spec}.{js,jsx,ts,tsx}"],
  testPathIgnorePatterns: [
    "<rootDir>/tests/performance.test.js",
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/coverage/",
    "<rootDir>/.husky/"
  ],
  moduleNameMapper: {
    "^@scripts/(.*)$": "<rootDir>/scripts/$1"
  },
  transformIgnorePatterns: ["/node_modules/(?!(uuid|@supabase|@radix-ui|p-limit|cheerio)/)"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  globals: {
    "ts-jest": {
      useESM: true
    }
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          allowSyntheticDefaultImports: true,
          esModuleInterop: true
        }
      }
    ]
  },
  // Projects configuration for different test types
  projects: [
    {
      displayName: "scripts",
      testEnvironment: "node",
      testMatch: ["<rootDir>/scripts/**/__tests__/**/*.{js,ts}", "<rootDir>/scripts/**/*.{test,spec}.{js,ts}"],
      extensionsToTreatAsEsm: [".ts"],
      globals: {
        "ts-jest": {
          useESM: true
        }
      },
      moduleFileExtensions: ["ts", "js"],
      transform: {
        "^.+\\.(ts)$": [
          "ts-jest",
          {
            useESM: true,
            tsconfig: {
              allowSyntheticDefaultImports: true,
              esModuleInterop: true
            }
          }
        ]
      }
    }
  ]
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig);
