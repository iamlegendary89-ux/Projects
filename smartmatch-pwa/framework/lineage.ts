/**
 * LZFOF v2.1 - Variant Lineage Tracking
 * 
 * Tracks the origin, agent, and modifications of each variant.
 */

import fs from 'fs';
import path from 'path';

export interface VariantMeta {
    origin: string | null;        // Parent variant (null for original)
    agent: string;                // AI that generated this (deepseek, gpt, claude, human)
    prompt: string;               // How it was generated
    modifications: string[];      // List of changes made
    timestamp: string;            // ISO timestamp
    generation: number;           // Evolution generation (0 for manual)
    score?: number;               // Last benchmark score
    passRate?: number;            // Last pass rate
}

export function getMetaPath(variantPath: string): string {
    const dir = path.dirname(variantPath);
    const base = path.basename(variantPath, path.extname(variantPath));
    return path.join(dir, `${base}.meta.json`);
}

export function loadMeta(variantPath: string): VariantMeta | null {
    const metaPath = getMetaPath(variantPath);
    try {
        if (fs.existsSync(metaPath)) {
            return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        }
    } catch { /* ignore */ }
    return null;
}

export function saveMeta(variantPath: string, meta: VariantMeta): void {
    const metaPath = getMetaPath(variantPath);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

export function createMeta(options: {
    origin?: string;
    agent?: string;
    prompt?: string;
    modifications?: string[];
    generation?: number;
}): VariantMeta {
    return {
        origin: options.origin || null,
        agent: options.agent || 'human',
        prompt: options.prompt || 'manual creation',
        modifications: options.modifications || [],
        timestamp: new Date().toISOString(),
        generation: options.generation || 0,
    };
}

export function updateMetaScore(variantPath: string, score: number, passRate: number): void {
    const existing = loadMeta(variantPath);
    if (existing) {
        existing.score = score;
        existing.passRate = passRate;
        saveMeta(variantPath, existing);
    }
}

// Analyze lineage patterns across all variants
export function analyzeLineage(targetDir: string): {
    winningPatterns: string[];
    commonOrigins: Record<string, number>;
    agentSuccess: Record<string, { wins: number; total: number }>;
} {
    const metaFiles = fs.readdirSync(targetDir).filter(f => f.endsWith('.meta.json'));

    const modifications: string[] = [];
    const origins: Record<string, number> = {};
    const agents: Record<string, { wins: number; total: number }> = {};

    for (const file of metaFiles) {
        try {
            const meta: VariantMeta = JSON.parse(fs.readFileSync(path.join(targetDir, file), 'utf8'));

            // Track modifications from high-scoring variants
            if (meta.score && meta.score > 0.9) {
                modifications.push(...meta.modifications);
            }

            // Track origins
            if (meta.origin) {
                origins[meta.origin] = (origins[meta.origin] || 0) + 1;
            }

            // Track agent success
            if (!agents[meta.agent]) {
                agents[meta.agent] = { wins: 0, total: 0 };
            }
            agents[meta.agent].total++;
            if (meta.passRate === 1 && meta.score && meta.score > 0.9) {
                agents[meta.agent].wins++;
            }
        } catch { /* ignore */ }
    }

    // Find most common winning patterns
    const patternCounts: Record<string, number> = {};
    for (const mod of modifications) {
        patternCounts[mod] = (patternCounts[mod] || 0) + 1;
    }

    const winningPatterns = Object.entries(patternCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([pattern]) => pattern);

    return { winningPatterns, commonOrigins: origins, agentSuccess: agents };
}

export default { loadMeta, saveMeta, createMeta, updateMetaScore, analyzeLineage };
