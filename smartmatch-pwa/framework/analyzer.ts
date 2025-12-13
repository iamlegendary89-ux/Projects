#!/usr/bin/env node
/**
 * LZFOF v1.0 - Module 4: Analyzer + Selector
 * 
 * Analyzes benchmark results and generates diff recommendations.
 * 
 * Usage: node analyzer.ts <functionName>
 */

import fs from "fs";
import path from "path";

interface VariantResult {
    variant: string;
    file: string;
    passed: number;
    failed: number;
    avgDurationMs: number;
    maxDurationMs: number;
    errors: string[];
}

interface BenchmarkResult {
    functionName: string;
    runAt: string;
    totalTestCases: number;
    variants: VariantResult[];
    winner: string | null;
    winnerReason: string;
}

interface AnalysisReport {
    functionName: string;
    analyzedAt: string;
    recommendation: {
        winner: string;
        reason: string;
        confidence: "high" | "medium" | "low";
        improvements: string[];
    };
    comparison: Array<{
        variant: string;
        passRate: string;
        avgMs: string;
        maxMs: string;
        complexity: number;
        score: number;
    }>;
    diff?: string;
}

// Simple complexity score based on code characteristics
function calculateComplexity(code: string): number {
    let score = 0;

    // Line count (lower is better)
    const lines = code.split("\n").filter(l => l.trim()).length;
    score += Math.min(lines / 10, 10); // Max 10 points for lines

    // Nesting depth
    const maxDepth = Math.max(
        ...code.split("\n").map(line => {
            const match = line.match(/^(\s*)/);
            return match ? match[1].length / 2 : 0;
        })
    );
    score += Math.min(maxDepth, 10); // Max 10 points for depth

    // Control flow complexity
    const controlKeywords = (code.match(/\b(if|else|for|while|switch|catch|try)\b/g) || []).length;
    score += Math.min(controlKeywords, 10); // Max 10 points for control flow

    // Ternary operators (adds complexity)
    const ternaries = (code.match(/\?.*:/g) || []).length;
    score += ternaries;

    return Math.round(score);
}

// Generate simple diff between two code blocks
function generateSimpleDiff(original: string, modified: string): string {
    const origLines = original.split("\n");
    const modLines = modified.split("\n");

    const diff: string[] = [];
    const maxLines = Math.max(origLines.length, modLines.length);

    for (let i = 0; i < maxLines; i++) {
        const origLine = origLines[i] || "";
        const modLine = modLines[i] || "";

        if (origLine !== modLine) {
            if (origLine) diff.push(`- ${origLine}`);
            if (modLine) diff.push(`+ ${modLine}`);
        } else if (origLine) {
            diff.push(`  ${origLine}`);
        }
    }

    return diff.join("\n");
}

export function analyzeResults(functionName: string): AnalysisReport {
    const resultsPath = path.join("./analysis", `${functionName}.json`);

    if (!fs.existsSync(resultsPath)) {
        throw new Error(`No results found at ${resultsPath}. Run benchmarks first.`);
    }

    const results: BenchmarkResult = JSON.parse(fs.readFileSync(resultsPath, "utf8"));

    // Load variant code for complexity analysis
    const variantDir = path.join("./variants", functionName);
    const comparison = results.variants.map(v => {
        const codePath = path.join(variantDir, `${v.variant}.ts`);
        const code = fs.existsSync(codePath) ? fs.readFileSync(codePath, "utf8") : "";
        const complexity = calculateComplexity(code);

        // Composite score: 50% pass rate, 30% speed, 20% simplicity
        const passRate = v.passed / results.totalTestCases;
        const speedScore = v.failed === 0 ? 1 / (1 + v.avgDurationMs) : 0;
        const simplicityScore = 1 / (1 + complexity / 30);

        const score = passRate * 0.5 + speedScore * 0.3 + simplicityScore * 0.2;

        return {
            variant: v.variant,
            passRate: `${Math.round(passRate * 100)}%`,
            avgMs: v.avgDurationMs.toFixed(3),
            maxMs: v.maxDurationMs.toFixed(3),
            complexity,
            score: Math.round(score * 100) / 100,
        };
    });

    // Sort by score, then by avgMs as tiebreaker
    comparison.sort((a, b) => {
        // Primary: score (higher is better)
        // Secondary: avgMs (lower is better) - tiebreaker for equal scores
        if (b.score !== a.score) return b.score - a.score;
        return parseFloat(a.avgMs) - parseFloat(b.avgMs);
    });

    // Determine winner and confidence
    const winner = comparison[0];
    const runnerUp = comparison[1];

    let confidence: "high" | "medium" | "low" = "medium";
    if (winner.passRate === "100%" && winner.score > 0.8) {
        confidence = "high";
    } else if (winner.passRate !== "100%") {
        confidence = "low";
    }

    const improvements: string[] = [];

    // Compare to original (v0-original)
    const original = comparison.find(c => c.variant === "v0-original");
    if (original && winner.variant !== "v0-original") {
        const speedImprovement = ((parseFloat(original.avgMs) - parseFloat(winner.avgMs)) / parseFloat(original.avgMs) * 100).toFixed(1);
        if (parseFloat(speedImprovement) > 0) {
            improvements.push(`${speedImprovement}% faster than original`);
        }

        const complexityDiff = original.complexity - winner.complexity;
        if (complexityDiff > 0) {
            improvements.push(`${complexityDiff} points less complex`);
        }
    }

    // Generate diff if we have a winner different from original
    let diff: string | undefined;
    if (winner.variant !== "v0-original") {
        const originalPath = path.join(variantDir, "v0-original.ts");
        const winnerPath = path.join(variantDir, `${winner.variant}.ts`);

        if (fs.existsSync(originalPath) && fs.existsSync(winnerPath)) {
            diff = generateSimpleDiff(
                fs.readFileSync(originalPath, "utf8"),
                fs.readFileSync(winnerPath, "utf8")
            );
        }
    }

    const report: AnalysisReport = {
        functionName,
        analyzedAt: new Date().toISOString(),
        recommendation: {
            winner: winner.variant,
            reason: improvements.length > 0
                ? improvements.join(", ")
                : "Best overall score",
            confidence,
            improvements,
        },
        comparison,
        diff,
    };

    // Save analysis report
    const reportPath = path.join("./analysis", `${functionName}-analysis.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
}

// Pretty print results
export function printAnalysis(report: AnalysisReport): void {
    console.log("\n" + "=".repeat(60));
    console.log(`📊 LZFOF ANALYSIS: ${report.functionName}`);
    console.log("=".repeat(60));

    console.log("\n📋 VARIANT COMPARISON:\n");
    console.log("┌──────────────────┬──────────┬──────────┬──────────┬───────────┬───────┐");
    console.log("│ Variant          │ Pass %   │ Avg ms   │ Max ms   │ Cmplxty   │ Score │");
    console.log("├──────────────────┼──────────┼──────────┼──────────┼───────────┼───────┤");

    for (const c of report.comparison) {
        console.log(`│ ${c.variant.padEnd(16)} │ ${c.passRate.padStart(8)} │ ${c.avgMs.padStart(8)} │ ${c.maxMs.padStart(8)} │ ${String(c.complexity).padStart(9)} │ ${c.score.toFixed(2).padStart(5)} │`);
    }

    console.log("└──────────────────┴──────────┴──────────┴──────────┴───────────┴───────┘");

    console.log(`\n🏆 RECOMMENDATION:`);
    console.log(`   Winner: ${report.recommendation.winner}`);
    console.log(`   Reason: ${report.recommendation.reason}`);
    console.log(`   Confidence: ${report.recommendation.confidence.toUpperCase()}`);

    if (report.recommendation.improvements.length > 0) {
        console.log(`\n✨ IMPROVEMENTS:`);
        report.recommendation.improvements.forEach(i => console.log(`   • ${i}`));
    }

    if (report.diff && report.recommendation.winner !== "v0-original") {
        console.log(`\n📝 To apply winner, run:`);
        console.log(`   npx tsx framework/lzfof.ts apply ${report.functionName} ${report.recommendation.winner}\n`);
    }
}

// CLI entry point
if (process.argv[1]?.includes("analyzer")) {
    const functionName = process.argv[2];

    if (!functionName) {
        console.error("Usage: npx tsx analyzer.ts <functionName>");
        process.exit(1);
    }

    try {
        const report = analyzeResults(functionName);
        printAnalysis(report);
    } catch (e) {
        console.error(`❌ ${e instanceof Error ? e.message : e}`);
        process.exit(1);
    }
}

export default analyzeResults;
