/**
 * LZFOF 2.0 - Function Runner
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { pathToFileURL } from 'url';
import type { TestCase, VariantResult, Runner } from '../types.js';

function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object' || a === null || b === null) return false;
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
        if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
    }
    return true;
}

export const functionRunner: Runner = {
    type: 'function',

    loadTestCases(targetName: string): TestCase[] {
        const testFile = path.join('./tests', `${targetName}.test.json`);
        if (!fs.existsSync(testFile)) return [];
        const data = JSON.parse(fs.readFileSync(testFile, 'utf8'));
        return data.cases || [];
    },

    async runVariant(variantPath: string, targetName: string, testCases: TestCase[]): Promise<VariantResult> {
        const variantName = path.basename(variantPath, path.extname(variantPath));
        const result: VariantResult = {
            variant: variantName,
            file: variantPath,
            passed: 0,
            failed: 0,
            errors: [],
            metrics: { avgDurationMs: 0, maxDurationMs: 0, memoryKB: 0 },
            testResults: [],
        };

        try {
            const moduleUrl = pathToFileURL(path.resolve(variantPath)).href;
            const module = await import(moduleUrl);
            const fn = module[targetName] || module.default;

            if (typeof fn !== 'function') {
                result.errors.push(`No function "${targetName}" exported`);
                return result;
            }

            const durations: number[] = [];
            const iterations = 10; // Keep low to avoid timeouts on network functions

            for (const testCase of testCases) {
                let totalDuration = 0;
                let lastResult: unknown;
                let testError: string | undefined;

                try {
                    for (let i = 0; i < iterations; i++) {
                        const start = performance.now();
                        const args = Array.isArray(testCase.input) ? testCase.input : [testCase.input];
                        lastResult = await fn(...args);
                        totalDuration += performance.now() - start;
                    }

                    const avgDuration = totalDuration / iterations;
                    durations.push(avgDuration);
                    const passed = deepEqual(lastResult, testCase.expected);
                    if (passed) result.passed++; else result.failed++;

                    result.testResults.push({
                        testId: testCase.id,
                        passed,
                        expected: testCase.expected,
                        actual: lastResult,
                        metrics: { durationMs: avgDuration },
                        error: testError,
                    });
                } catch (e: unknown) {
                    testError = e instanceof Error ? e.message : String(e);
                    result.failed++;
                    result.errors.push(`Test ${testCase.id}: ${testError}`);
                }
            }

            if (durations.length > 0) {
                result.metrics.avgDurationMs = durations.reduce((a, b) => a + b, 0) / durations.length;
                result.metrics.maxDurationMs = Math.max(...durations);
            }
        } catch (e: unknown) {
            result.errors.push(`Import error: ${e instanceof Error ? e.message : String(e)}`);
        }

        return result;
    },
};

export default functionRunner;
