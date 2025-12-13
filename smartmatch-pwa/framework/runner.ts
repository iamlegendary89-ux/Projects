#!/usr/bin/env node
/**
 * LZFOF v1.0 - Module 3: Universal Test + Benchmark Runner
 * 
 * Runs test cases against all variants, benchmarks valid ones.
 * Saves results to analysis/<functionName>.json
 * 
 * Usage: node runner.ts <functionName>
 */

import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { pathToFileURL } from "url";

interface TestCase {
    id: string;
    args: unknown[];
    expect: unknown;
    description?: string;
}

interface VariantResult {
    variant: string;
    file: string;
    passed: number;
    failed: number;
    errors: string[];
    avgDurationMs: number;
    maxDurationMs: number;
    minDurationMs: number;
    memoryDeltaKB: number;
    testResults: Array<{
        testId: string;
        passed: boolean;
        expected: unknown;
        actual: unknown;
        durationMs: number;
        error?: string;
    }>;
}

interface BenchmarkResult {
    functionName: string;
    runAt: string;
    totalTestCases: number;
    variants: VariantResult[];
    winner: string | null;
    winnerReason: string;
}

// Deep equality check
function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object" || a === null || b === null) return false;

    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
    }

    return true;
}

// Load test cases for a function
function loadTestCases(functionName: string): TestCase[] {
    const testFile = path.join("./tests", `${functionName}.test.json`);

    if (!fs.existsSync(testFile)) {
        console.error(`❌ No test cases found at ${testFile}`);
        console.log(`\n📝 Create ${testFile} with format:`);
        console.log(JSON.stringify({
            cases: [
                { id: "example-1", args: ["input"], expect: "output" },
            ]
        }, null, 2));
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(testFile, "utf8"));
    return data.cases || [];
}

// Find all variant files
function findVariants(functionName: string): string[] {
    const variantDir = path.join("./variants", functionName);

    if (!fs.existsSync(variantDir)) {
        console.error(`❌ No variants found at ${variantDir}`);
        process.exit(1);
    }

    return fs.readdirSync(variantDir)
        .filter(f => f.endsWith(".ts") || f.endsWith(".js"))
        .map(f => path.join(variantDir, f));
}

// Run a single variant against all test cases
async function runVariant(
    variantPath: string,
    functionName: string,
    testCases: TestCase[],
    iterations: number = 10
): Promise<VariantResult> {
    const variantName = path.basename(variantPath, path.extname(variantPath));

    const result: VariantResult = {
        variant: variantName,
        file: variantPath,
        passed: 0,
        failed: 0,
        errors: [],
        avgDurationMs: 0,
        maxDurationMs: 0,
        minDurationMs: Infinity,
        memoryDeltaKB: 0,
        testResults: [],
    };

    try {
        // Dynamic import the variant
        const moduleUrl = pathToFileURL(path.resolve(variantPath)).href;
        const module = await import(moduleUrl);
        const fn = module[functionName] || module.default;

        if (typeof fn !== "function") {
            result.errors.push(`No function "${functionName}" exported`);
            return result;
        }

        const durations: number[] = [];
        const memBefore = process.memoryUsage().heapUsed;

        // Run each test case
        for (const testCase of testCases) {
            let totalDuration = 0;
            let lastResult: unknown;
            let testPassed = false;
            let testError: string | undefined;

            try {
                // Run multiple iterations for accurate timing
                for (let i = 0; i < iterations; i++) {
                    const start = performance.now();
                    lastResult = await fn(...testCase.args);
                    totalDuration += performance.now() - start;
                }

                const avgDuration = totalDuration / iterations;
                durations.push(avgDuration);

                testPassed = deepEqual(lastResult, testCase.expect);
                if (testPassed) {
                    result.passed++;
                } else {
                    result.failed++;
                }
            } catch (e: unknown) {
                testError = e instanceof Error ? e.message : String(e);
                result.failed++;
                result.errors.push(`Test ${testCase.id}: ${testError}`);
            }

            result.testResults.push({
                testId: testCase.id,
                passed: testPassed,
                expected: testCase.expect,
                actual: lastResult,
                durationMs: durations[durations.length - 1] || 0,
                error: testError,
            });
        }

        const memAfter = process.memoryUsage().heapUsed;
        result.memoryDeltaKB = Math.round((memAfter - memBefore) / 1024);

        if (durations.length > 0) {
            result.avgDurationMs = durations.reduce((a, b) => a + b, 0) / durations.length;
            result.maxDurationMs = Math.max(...durations);
            result.minDurationMs = Math.min(...durations);
        }

    } catch (e: unknown) {
        result.errors.push(`Import error: ${e instanceof Error ? e.message : String(e)}`);
    }

    return result;
}

// Main runner
export async function runBenchmark(functionName: string): Promise<BenchmarkResult> {
    console.log(`\n🧪 LZFOF Benchmark: ${functionName}\n`);

    const testCases = loadTestCases(functionName);
    console.log(`📋 Loaded ${testCases.length} test cases`);

    const variantFiles = findVariants(functionName);
    console.log(`📁 Found ${variantFiles.length} variants\n`);

    const results: VariantResult[] = [];

    for (const variantPath of variantFiles) {
        process.stdout.write(`  Testing ${path.basename(variantPath)}... `);
        const result = await runVariant(variantPath, functionName, testCases);
        results.push(result);

        const status = result.failed === 0 ? "✅" : "❌";
        console.log(`${status} ${result.passed}/${testCases.length} passed (${result.avgDurationMs.toFixed(3)}ms avg)`);
    }

    // Find winner (highest pass rate, then fastest)
    const validVariants = results.filter(r => r.failed === 0);
    let winner: string | null = null;
    let winnerReason = "";

    if (validVariants.length > 0) {
        validVariants.sort((a, b) => a.avgDurationMs - b.avgDurationMs);
        winner = validVariants[0].variant;
        const speedup = results.find(r => r.variant === "v0-original")?.avgDurationMs;
        if (speedup && speedup > 0) {
            const improvement = ((speedup - validVariants[0].avgDurationMs) / speedup * 100).toFixed(1);
            winnerReason = `Fastest valid variant (+${improvement}% vs original)`;
        } else {
            winnerReason = "Fastest valid variant";
        }
    } else {
        winnerReason = "No valid variants (all have failures)";
    }

    const benchmark: BenchmarkResult = {
        functionName,
        runAt: new Date().toISOString(),
        totalTestCases: testCases.length,
        variants: results,
        winner,
        winnerReason,
    };

    // Save results
    const analysisDir = "./analysis";
    if (!fs.existsSync(analysisDir)) {
        fs.mkdirSync(analysisDir, { recursive: true });
    }

    const outputPath = path.join(analysisDir, `${functionName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(benchmark, null, 2));

    console.log(`\n📊 Results saved to ${outputPath}`);

    if (winner) {
        console.log(`\n🏆 WINNER: ${winner}`);
        console.log(`   ${winnerReason}\n`);
    }

    return benchmark;
}

// CLI entry point
if (process.argv[1]?.includes("runner")) {
    const functionName = process.argv[2];

    if (!functionName) {
        console.error("Usage: npx tsx runner.ts <functionName>");
        process.exit(1);
    }

    runBenchmark(functionName).catch(console.error);
}

export default runBenchmark;
