/**
 * R.E.A.L.™ Archetype System
 * 
 * 10 Archetypes — Derived from 28 latent traits
 * These compress explanation and improve UX trust — they don't decide phones.
 */

import type { TraitVector, TraitName } from "./traits";

// =============================================================================
// ARCHETYPE DEFINITIONS (10 REAL™ Archetypes)
// =============================================================================

export const ARCHETYPE_NAMES = [
    "stabilizer",
    "endurer",
    "visualist",
    "minimalist",
    "powerCasual",
    "specChaser",
    "regretAverse",
    "loyalist",
    "valueMaximizer",
    "futureProofer",
] as const;

export type ArchetypeName = typeof ARCHETYPE_NAMES[number];

export interface ArchetypeProfile {
    name: ArchetypeName;
    label: string;
    description: string;
    icon: string;
    tagline: string;
}

export const ARCHETYPE_PROFILES: Record<ArchetypeName, ArchetypeProfile> = {
    stabilizer: {
        name: "stabilizer",
        label: "The Stabilizer",
        description: "Values consistency and reliability above all else",
        icon: "⚖️",
        tagline: "Smooth and steady wins the race",
    },
    endurer: {
        name: "endurer",
        label: "The Endurer",
        description: "Battery life is the ultimate priority",
        icon: "🔋",
        tagline: "A dead phone is a useless phone",
    },
    visualist: {
        name: "visualist",
        label: "The Visualist",
        description: "Camera and display quality define the experience",
        icon: "📸",
        tagline: "If it doesn't look great, what's the point?",
    },
    minimalist: {
        name: "minimalist",
        label: "The Minimalist",
        description: "Seeks simplicity and value over excess",
        icon: "🎯",
        tagline: "Less is more, always",
    },
    powerCasual: {
        name: "powerCasual",
        label: "The Power Casual",
        description: "Wants performance without the complexity",
        icon: "😎",
        tagline: "Fast, but I don't want to think about it",
    },
    specChaser: {
        name: "specChaser",
        label: "The Spec Chaser",
        description: "Numbers matter — always wants the best specs",
        icon: "🏎️",
        tagline: "Benchmarks don't lie",
    },
    regretAverse: {
        name: "regretAverse",
        label: "The Regret-Averse",
        description: "Avoids buyer's remorse at all costs",
        icon: "🛡️",
        tagline: "The worst feeling is wishing you'd chosen differently",
    },
    loyalist: {
        name: "loyalist",
        label: "The Loyalist",
        description: "Deeply invested in their ecosystem",
        icon: "🏠",
        tagline: "Switching isn't worth the hassle",
    },
    valueMaximizer: {
        name: "valueMaximizer",
        label: "The Value Maximizer",
        description: "Every dollar must be justified",
        icon: "💎",
        tagline: "Best bang for the buck, period",
    },
    futureProofer: {
        name: "futureProofer",
        label: "The Future-Proofer",
        description: "Plans for longevity and continued support",
        icon: "🌳",
        tagline: "This phone should last years, not months",
    },
};

// =============================================================================
// ARCHETYPE WEIGHT MATRIX
// =============================================================================

/**
 * Weight matrix: archetypeWeights[archetype][trait] = weight
 * Higher weight = trait more strongly indicates this archetype
 */
export const ARCHETYPE_WEIGHTS: Record<ArchetypeName, Partial<Record<TraitName, number>>> = {
    stabilizer: {
        lagSensitivity: -0.25, // Low sensitivity = wants stability
        consistencyBias: 0.30,
        thermalTolerance: 0.15,
        riskAversion: 0.20,
        patience: 0.10,
    },
    endurer: {
        batteryStress: 0.35,
        chargingAnxiety: 0.25,
        endurancePriority: 0.25,
        longevityBias: 0.10,
        patience: -0.05,
    },
    visualist: {
        cameraReliance: 0.35,
        visualAcuity: 0.25,
        displayPriority: 0.20,
        aestheticAttachment: 0.15,
        lowLightExpectation: 0.05,
    },
    minimalist: {
        valueElasticity: 0.30,
        valueSensitivity: 0.25,
        patience: 0.15,
        specChasing: -0.20,
        upgradeImpulse: -0.10,
    },
    powerCasual: {
        thermalTolerance: 0.25,
        consistencyBias: 0.20,
        benchmarkBias: -0.15,
        patience: 0.20,
        lagSensitivity: -0.10,
    },
    specChaser: {
        benchmarkBias: 0.35,
        specChasing: 0.30,
        noveltySeeking: 0.15,
        valueElasticity: -0.15,
        patience: -0.10,
    },
    regretAverse: {
        regretAversion: 0.40,
        riskAversion: 0.25,
        overbuyPenalty: 0.15,
        consistencyBias: 0.10,
        noveltySeeking: -0.10,
    },
    loyalist: {
        ecosystemGravity: 0.35,
        brandTrustWeight: 0.25,
        accessoryLockIn: 0.20,
        learningTolerance: -0.15,
        consistencyNeed: 0.15,
    },
    valueMaximizer: {
        valueElasticity: 0.35,
        priceElasticity: 0.25,
        valueSensitivity: 0.20,
        depreciationSensitivity: 0.10,
        premiumTolerance: -0.15,
    },
    futureProofer: {
        longevityExpectation: 0.35,
        OSSupportWeight: 0.25,
        futureProofing: 0.20,
        depreciationSensitivity: 0.10,
        upgradeImpulse: -0.15,
    },
};

// =============================================================================
// ARCHETYPE PROJECTION
// =============================================================================

export interface ArchetypeResult {
    primary: ArchetypeName;
    secondary: ArchetypeName | null;
    scores: Record<ArchetypeName, number>;
    confidence: number;
    profile: ArchetypeProfile;
}

/**
 * Project trait vector onto archetype space
 * Returns primary + secondary archetype with confidence
 */
export function projectArchetype(traits: TraitVector): ArchetypeResult {
    const scores: Record<ArchetypeName, number> = {} as Record<ArchetypeName, number>;

    // Calculate score for each archetype
    for (const archetype of ARCHETYPE_NAMES) {
        let score = 0;
        const weights = ARCHETYPE_WEIGHTS[archetype];

        for (const [trait, weight] of Object.entries(weights)) {
            const traitValue = traits[trait as TraitName] ?? 0.5;
            // Score = sum of (trait deviation from neutral) * weight
            score += (traitValue - 0.5) * 2 * (weight || 0);
        }

        scores[archetype] = score;
    }

    // Sort by score
    const sorted = ARCHETYPE_NAMES.slice().sort((a, b) => scores[b] - scores[a]);

    const primary = sorted[0];
    const secondary = scores[sorted[1]] > 0.1 ? sorted[1] : null;

    // Confidence based on separation between top scores
    const separation = scores[sorted[0]] - scores[sorted[1]];
    const confidence = Math.min(1, 0.5 + separation * 2);

    return {
        primary,
        secondary,
        scores,
        confidence,
        profile: ARCHETYPE_PROFILES[primary],
    };
}

/**
 * Get archetype explanation for user
 */
export function getArchetypeExplanation(archetype: ArchetypeName): string {
    const profile = ARCHETYPE_PROFILES[archetype];
    return `${profile.icon} ${profile.label}: ${profile.tagline}`;
}
