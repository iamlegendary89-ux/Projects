/**
 * LZFOF 2.0 - Regex Runner
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import type { TestCase, VariantResult, Runner } from '../types.js';

interface RegexTestCase extends TestCase {
    input: string;
    expected: boolean; // shouldMatch
}

export const regexRunner: Runner = {
    type: 'regex',

    loadTestCases(targetName: string): TestCase[] {
        const testFile = path.join('./tests', `${targetName}.test.json`);
        if (!fs.existsSync(testFile)) return [];
        const data = JSON.parse(fs.readFileSync(testFile, 'utf8'));
        return data.corpus || data.cases || [];
    },

    async runVariant(variantPath: string, targetName: string, testCases: TestCase[]): Promise<VariantResult> {
        const variantName = path.basename(variantPath, path.extname(variantPath));
        const result: VariantResult = {
            variant: variantName,
            file: variantPath,
            passed: 0,
            failed: 0,
            errors: [],
            metrics: { accuracy: 0, opsPerSec: 0, falsePositives: 0, falseNegatives: 0 },
            testResults: [],
        };

        try {
            // Read the regex from the variant file
            const content = fs.readFileSync(variantPath, 'utf8');
            const regexMatch = content.match(/(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(\/[^\/]+\/[gimsuvy]*)/);

            if (!regexMatch) {
                result.errors.push('No regex pattern found in variant');
                return result;
            }

            // Parse the regex - eval is safe here as we control the input
            const regexStr = regexMatch[1];
            const flagsMatch = regexStr.match(/\/([gimsuvy]*)$/);
            const flags = flagsMatch ? flagsMatch[1] : '';
            const pattern = regexStr.slice(1, regexStr.lastIndexOf('/'));
            const regex = new RegExp(pattern, flags);

            const iterations = 1000;
            let totalOps = 0;
            const startBench = performance.now();

            for (const testCase of testCases as RegexTestCase[]) {
                const input = String(testCase.input);
                const shouldMatch = Boolean(testCase.expected);

                // Run multiple iterations for timing
                for (let i = 0; i < iterations; i++) {
                    regex.lastIndex = 0;
                    regex.test(input);
                    totalOps++;
                }

                // Get actual result
                regex.lastIndex = 0;
                const didMatch = regex.test(input);
                const passed = didMatch === shouldMatch;

                if (passed) {
                    result.passed++;
                } else {
                    result.failed++;
                    if (didMatch && !shouldMatch) result.metrics.falsePositives++;
                    if (!didMatch && shouldMatch) result.metrics.falseNegatives++;
                }

                result.testResults.push({
                    testId: testCase.id,
                    passed,
                    expected: shouldMatch,
                    actual: didMatch,
                    metrics: {},
                });
            }

            const duration = performance.now() - startBench;
            result.metrics.opsPerSec = Math.round(totalOps / (duration / 1000));
            result.metrics.accuracy = testCases.length > 0 ? result.passed / testCases.length : 0;

        } catch (e: unknown) {
            result.errors.push(`Regex error: ${e instanceof Error ? e.message : String(e)}`);
        }

        return result;
    },
};

export default regexRunner;
