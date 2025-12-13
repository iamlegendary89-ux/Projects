/**
 * LZFOF v2.1 - Mutation-Assisted Test Coverage
 * 
 * Auto-generates edge case test inputs to stress-test variants.
 */

import fs from 'fs';
import path from 'path';
import type { TestCase, TargetType } from './types.js';

export interface MutationConfig {
    stringMutations: boolean;
    numericMutations: boolean;
    unicodeMutations: boolean;
    nullMutations: boolean;
    sizeMutations: boolean;
    fuzzCount: number;
}

const DEFAULT_CONFIG: MutationConfig = {
    stringMutations: true,
    numericMutations: true,
    unicodeMutations: true,
    nullMutations: true,
    sizeMutations: true,
    fuzzCount: 10,
};

// String mutations
const STRING_MUTATIONS = [
    '',                           // Empty
    ' ',                          // Single space
    '   ',                        // Multiple spaces
    '\t\n\r',                     // Whitespace chars
    'a'.repeat(10000),            // Very long
    '日本語テスト',                // Unicode
    '🔥🎉💯',                      // Emoji
    '<script>alert(1)</script>', // XSS attempt
    'null',                       // String "null"
    'undefined',                  // String "undefined"
    'true',                       // String "true"
    '123',                        // Numeric string
    '-1',                         // Negative numeric string
    '0',                          // Zero string
    'NaN',                        // NaN string
    'Infinity',                   // Infinity string
    '{"key": "value"}',           // JSON string
    '[1,2,3]',                    // Array string
    'path/to/file.txt',           // Path-like
    'https://example.com',        // URL
    'user@example.com',           // Email
    '\x00\x01\x02',               // Control chars
    '\\n\\t\\r',                  // Escaped chars as literals
];

// Numeric mutations
const NUMBER_MUTATIONS = [
    0,
    -1,
    1,
    -0,
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_VALUE,
    Number.MIN_VALUE,
    Infinity,
    -Infinity,
    NaN,
    0.1 + 0.2,  // Floating point precision
    1e10,
    1e-10,
    Math.PI,
];

// Generate mutated test cases
export function generateMutations(
    existingCases: TestCase[],
    targetType: TargetType,
    config: MutationConfig = DEFAULT_CONFIG
): TestCase[] {
    const mutations: TestCase[] = [];
    let idCounter = 1000;

    // Analyze existing cases to understand input structure
    const sampleCase = existingCases[0];
    if (!sampleCase) return mutations;

    const sampleInput = Array.isArray(sampleCase.input) ? sampleCase.input : [sampleCase.input];

    for (let i = 0; i < sampleInput.length; i++) {
        const argType = typeof sampleInput[i];

        if (argType === 'string' && config.stringMutations) {
            for (const mutation of STRING_MUTATIONS.slice(0, config.fuzzCount)) {
                const mutatedInput = [...sampleInput];
                mutatedInput[i] = mutation;

                mutations.push({
                    id: `mutation-${idCounter++}`,
                    input: mutatedInput.length === 1 ? mutatedInput[0] : mutatedInput,
                    expected: null, // Will be filled by running original
                    description: `String mutation: ${String(mutation).slice(0, 20)}...`,
                });
            }
        }

        if (argType === 'number' && config.numericMutations) {
            for (const mutation of NUMBER_MUTATIONS.slice(0, config.fuzzCount)) {
                const mutatedInput = [...sampleInput];
                mutatedInput[i] = mutation;

                mutations.push({
                    id: `mutation-${idCounter++}`,
                    input: mutatedInput.length === 1 ? mutatedInput[0] : mutatedInput,
                    expected: null,
                    description: `Numeric mutation: ${mutation}`,
                });
            }
        }

        if (config.nullMutations) {
            const nullInput = [...sampleInput];
            nullInput[i] = null as unknown;
            mutations.push({
                id: `mutation-${idCounter++}`,
                input: nullInput.length === 1 ? nullInput[0] : nullInput,
                expected: null,
                description: `Null mutation for arg ${i}`,
            });

            const undefinedInput = [...sampleInput];
            undefinedInput[i] = undefined as unknown;
            mutations.push({
                id: `mutation-${idCounter++}`,
                input: undefinedInput.length === 1 ? undefinedInput[0] : undefinedInput,
                expected: null,
                description: `Undefined mutation for arg ${i}`,
            });
        }
    }

    return mutations;
}

// Run original function to establish expected outputs for mutations
export async function establishExpectations(
    mutations: TestCase[],
    originalFn: (...args: unknown[]) => unknown
): Promise<TestCase[]> {
    const validated: TestCase[] = [];

    for (const mutation of mutations) {
        try {
            const args = Array.isArray(mutation.input) ? mutation.input : [mutation.input];
            const result = await originalFn(...args);

            // Only keep if it doesn't throw
            validated.push({
                ...mutation,
                expected: result,
            });
        } catch {
            // Skip mutations that cause errors in original
        }
    }

    return validated;
}

// Save mutations to test file
export function saveMutations(targetName: string, mutations: TestCase[]): void {
    const testFile = path.join('./tests', `${targetName}.test.json`);

    let existing: { cases: TestCase[] } = { cases: [] };
    if (fs.existsSync(testFile)) {
        existing = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    }

    // Filter out duplicates
    const existingIds = new Set(existing.cases.map(c => c.id));
    const newMutations = mutations.filter(m => !existingIds.has(m.id));

    existing.cases.push(...newMutations);
    fs.writeFileSync(testFile, JSON.stringify(existing, null, 2));

    console.log(`✅ Added ${newMutations.length} mutation test cases to ${testFile}`);
}

export default { generateMutations, establishExpectations, saveMutations };
