/**
 * LZFOF v2.1 - N-Generation Evolution Engine
 * 
 * Genetic programming with LLM-assisted mutations.
 * Runs multiple generations to find superhuman implementations.
 */

import fs from 'fs';
import path from 'path';
import { createMeta, saveMeta, loadMeta, type VariantMeta } from './lineage.js';
import type { VariantResult, BenchmarkResult } from './types.js';

export interface EvolutionConfig {
    generations: number;
    populationSize: number;
    mutationRate: number;
    eliteCount: number;
    crossoverEnabled: boolean;
}

export interface EvolutionResult {
    generations: GenerationResult[];
    bestVariant: string;
    bestScore: number;
    improvementPath: string[];
}

export interface GenerationResult {
    generation: number;
    variants: string[];
    scores: Record<string, number>;
    winner: string;
    winnerScore: number;
}

const DEFAULT_CONFIG: EvolutionConfig = {
    generations: 10,
    populationSize: 5,
    mutationRate: 0.3,
    eliteCount: 2,
    crossoverEnabled: true,
};

// Select top performers for next generation
export function selectElites(
    scores: Record<string, number>,
    count: number
): string[] {
    return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([variant]) => variant);
}

// Generate evolution prompt for next generation
export function generateEvolutionPrompt(
    originalCode: string,
    eliteVariants: Array<{ code: string; score: number; modifications: string[] }>,
    generation: number
): string {
    const eliteDescriptions = eliteVariants
        .map((e, i) => `Elite ${i + 1} (score: ${e.score.toFixed(3)}):\n- Modifications: ${e.modifications.join(', ')}`)
        .join('\n\n');

    return `
GENERATION ${generation} - EVOLUTIONARY OPTIMIZATION

ORIGINAL FUNCTION:
\`\`\`
${originalCode}
\`\`\`

TOP PERFORMERS FROM PREVIOUS GENERATION:
${eliteDescriptions}

YOUR TASK:
Generate 3 NEW variants that:
1. COMBINE successful patterns from elites (crossover)
2. INTRODUCE novel optimizations not yet tried (mutation)
3. PRESERVE 100% correctness - same inputs = same outputs

MUTATION IDEAS TO TRY:
- Loop unrolling
- Memoization / caching
- Bit manipulation tricks
- Reduce allocations
- Eliminate branches
- Use typed arrays
- Inline helper functions
- Precompute constants

Return 3 variants, each starting with:
// GEN${generation}-V[N]: [description of changes]
`.trim();
}

// Track evolution history
export function saveEvolutionHistory(
    targetName: string,
    result: EvolutionResult
): void {
    const historyDir = './analysis/evolution';
    if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
    }

    const historyPath = path.join(historyDir, `${targetName}.evolution.json`);
    fs.writeFileSync(historyPath, JSON.stringify(result, null, 2));
}

// Analyze evolution patterns
export function analyzeEvolution(result: EvolutionResult): {
    convergenceGeneration: number;
    totalImprovement: number;
    winningPatterns: string[];
} {
    const scores = result.generations.map(g => g.winnerScore);

    // Find when improvement plateaued
    let convergenceGeneration = result.generations.length;
    for (let i = 1; i < scores.length; i++) {
        if (Math.abs((scores[i] || 0) - (scores[i - 1] || 0)) < 0.001) {
            convergenceGeneration = i;
            break;
        }
    }

    const totalImprovement = (scores[scores.length - 1] || 0) - (scores[0] || 0);

    return {
        convergenceGeneration,
        totalImprovement,
        winningPatterns: result.improvementPath,
    };
}

// Create a variant from evolution
export function createEvolutionVariant(
    targetDir: string,
    generation: number,
    variantNum: number,
    code: string,
    parentVariant: string,
    modifications: string[]
): string {
    const fileName = `gen${generation}-v${variantNum}.ts`;
    const filePath = path.join(targetDir, fileName);

    fs.writeFileSync(filePath, code);

    const meta = createMeta({
        origin: parentVariant,
        agent: 'lzfof-evolution',
        prompt: `Generation ${generation} evolution`,
        modifications,
        generation,
    });

    saveMeta(filePath, meta);

    return filePath;
}

export default {
    selectElites,
    generateEvolutionPrompt,
    saveEvolutionHistory,
    analyzeEvolution,
    createEvolutionVariant,
    DEFAULT_CONFIG,
};
