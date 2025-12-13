/**
 * LZFOF 2.0 - Shared Types
 */

export type TargetType = 'function' | 'regex' | 'prompt' | 'config' | 'query' | 'struct';

export interface ExtractedItem {
    name: string;
    type: TargetType;
    code: string;
    start: number;
    end: number;
    file: string;
    metadata?: Record<string, unknown>;
}

export interface TestCase {
    id: string;
    input: unknown;
    expected: unknown;
    description?: string;
}

export interface VariantResult {
    variant: string;
    file: string;
    passed: number;
    failed: number;
    errors: string[];
    metrics: Record<string, number>;
    testResults: Array<{
        testId: string;
        passed: boolean;
        expected: unknown;
        actual: unknown;
        metrics: Record<string, number>;
        error?: string;
    }>;
}

export interface BenchmarkResult {
    targetName: string;
    targetType: TargetType;
    runAt: string;
    totalTestCases: number;
    variants: VariantResult[];
    winner: string | null;
    winnerReason: string;
}

export interface AnalysisReport {
    targetName: string;
    targetType: TargetType;
    analyzedAt: string;
    recommendation: {
        winner: string;
        reason: string;
        confidence: 'high' | 'medium' | 'low';
        improvements: string[];
    };
    comparison: Array<{
        variant: string;
        passRate: string;
        primaryMetric: string;
        secondaryMetric: string;
        complexity: number;
        score: number;
    }>;
    diff?: string;
}

// Extractor interface - each target type implements this
export interface Extractor {
    type: TargetType;
    extract(filePath: string): ExtractedItem[];
    generatePrompt(item: ExtractedItem, numVariants?: number): string;
}

// Runner interface - each target type implements this
export interface Runner {
    type: TargetType;
    loadTestCases(targetName: string): TestCase[];
    runVariant(variantPath: string, targetName: string, testCases: TestCase[]): Promise<VariantResult>;
}

// Metric definitions per target type
export const METRICS_BY_TYPE: Record<TargetType, { primary: string; secondary: string; weights: number[] }> = {
    function: { primary: 'avgDurationMs', secondary: 'memoryKB', weights: [0.5, 0.3, 0.2] },
    regex: { primary: 'accuracy', secondary: 'opsPerSec', weights: [0.6, 0.25, 0.15] },
    prompt: { primary: 'quality', secondary: 'tokens', weights: [0.6, 0.2, 0.2] },
    config: { primary: 'successRate', secondary: 'coverage', weights: [0.7, 0.2, 0.1] },
    query: { primary: 'hitRate', secondary: 'relevance', weights: [0.6, 0.3, 0.1] },
    struct: { primary: 'opsPerSec', secondary: 'memoryKB', weights: [0.5, 0.35, 0.15] },
};
