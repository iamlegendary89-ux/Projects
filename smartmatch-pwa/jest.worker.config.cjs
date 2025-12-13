module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    testMatch: ['<rootDir>/worker/**/__tests__/**/*.test.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'worker/tsconfig.json',
            useESM: true,
            isolatedModules: true
        }]
    },
    moduleNameMapper: {
        '^@/worker/(.*)$': '<rootDir>/worker/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1'
    }
};
