/**
 * LZFOF v2.1 - Optimization Profiles
 * 
 * Profiles adjust scoring weights for different optimization goals.
 */

export type ProfileName = 'fastest' | 'simple' | 'balanced' | 'safe';

export interface Profile {
    name: ProfileName;
    description: string;
    weights: {
        correctness: number;  // Pass rate importance
        speed: number;        // Performance importance
        simplicity: number;   // Code complexity importance
    };
    constraints: {
        minPassRate: number;      // Minimum acceptable pass rate (0-1)
        maxComplexity?: number;   // Maximum acceptable complexity
        preferOriginal: boolean;  // Prefer original if tie
    };
}

export const PROFILES: Record<ProfileName, Profile> = {
    fastest: {
        name: 'fastest',
        description: 'Optimize for maximum speed, simplicity secondary',
        weights: { correctness: 0.4, speed: 0.45, simplicity: 0.15 },
        constraints: { minPassRate: 1.0, preferOriginal: false },
    },

    simple: {
        name: 'simple',
        description: 'Optimize for readability and minimal complexity',
        weights: { correctness: 0.4, speed: 0.15, simplicity: 0.45 },
        constraints: { minPassRate: 1.0, maxComplexity: 10, preferOriginal: false },
    },

    balanced: {
        name: 'balanced',
        description: 'Equal weight to speed and simplicity',
        weights: { correctness: 0.5, speed: 0.25, simplicity: 0.25 },
        constraints: { minPassRate: 1.0, preferOriginal: false },
    },

    safe: {
        name: 'safe',
        description: 'Prioritize correctness, prefer original on ties',
        weights: { correctness: 0.7, speed: 0.15, simplicity: 0.15 },
        constraints: { minPassRate: 1.0, preferOriginal: true },
    },
};

export function getProfile(name: string): Profile {
    return PROFILES[name as ProfileName] || PROFILES.balanced;
}

export function calculateScore(
    passRate: number,
    speedMetric: number,
    complexity: number,
    profile: Profile
): number {
    const { weights } = profile;

    // Normalize speed (lower is better, invert)
    const speedScore = 1 / (1 + speedMetric);

    // Normalize complexity (lower is better, invert, cap at 50)
    const complexityScore = 1 - Math.min(complexity, 50) / 50;

    return (
        passRate * weights.correctness +
        speedScore * weights.speed +
        complexityScore * weights.simplicity
    );
}

export default PROFILES;
