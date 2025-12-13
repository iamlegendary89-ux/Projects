/** @type {import('jest').Config} */
export default {
    displayName: 'enrichment-tests',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true,
            tsconfig: {
                allowSyntheticDefaultImports: true,
                esModuleInterop: true,
                module: 'ESNext',
                moduleResolution: 'node',
            },
        }],
    },
    testMatch: ['**/tests/unit/enrichment*.test.ts'],
    collectCoverageFrom: ['scripts/enrichment.ts'],
    coverageReporters: ['text', 'html', 'lcov'],
};
