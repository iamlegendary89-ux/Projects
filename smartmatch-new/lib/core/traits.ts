/**
 * R.E.A.L.™ Trait System
 * 
 * 28 Latent Traits organized into 6 groups
 * These are stable, predictive of regret, and inferable indirectly.
 */

// =============================================================================
// TRAIT NAMES (28 total, organized by REAL groups)
// =============================================================================

export const TRAIT_NAMES = [
    // Group 1: Power & Stability
    "lagSensitivity",
    "thermalTolerance",
    "performanceFloor",
    "toleranceVariance",
    "benchmarkBias",
    "sustainedPerfWeight",

    // Group 2: Energy & Endurance
    "batteryStress",
    "chargingAnxiety",
    "endurancePriority",

    // Group 3: Visual Perception
    "cameraReliance",
    "consistencyBias",
    "lowLightExpectation",
    "visualAcuity",
    "displayPriority",

    // Group 4: Longevity & Regret
    "longevityExpectation",
    "depreciationSensitivity",
    "OSSupportWeight",
    "regretAversion",
    "overbuyPenalty",
    "posteriorConfidence",

    // Group 5: Behavioral Risk
    "specChasing",
    "brandTrustWeight",
    "riskProfile",
    "noveltySeeking",
    "upgradeImpulse",
    "OSRiskTolerance",
    "softwareTrust",

    // Group 6: Practical Constraints
    "storageAnxiety",
    "futureGrowthWeight",
    "priceElasticity",
    "valueSensitivity",
    "valueElasticity",
    "premiumTolerance",

    // Meta traits
    "patience",
    "aestheticAttachment",
    "ecosystemGravity",
    "accessoryLockIn",
    "thermalAversion",
    "sustainedLoadBias",
    "ergonomicsWeight",
    "designPriority",
    "consistencyNeed",
    "learningTolerance",
    "futureProofing",
    "longevityBias",
    "riskAversion",
] as const;

export type TraitName = typeof TRAIT_NAMES[number];

// =============================================================================
// TRAIT VECTOR
// =============================================================================

/**
 * TraitVector: All traits normalized to 0-1 range
 * 0.5 = neutral prior
 */
export type TraitVector = Record<TraitName, number>;

/**
 * Partial trait delta from a question answer
 */
export type TraitDelta = Partial<TraitVector> & {
    regretTrigger?: string;  // For Q9 final check
    posteriorLock?: number;  // For Q15 final lock
};

// =============================================================================
// TRAIT GROUP METADATA
// =============================================================================

export interface TraitGroup {
    name: string;
    description: string;
    traits: TraitName[];
}

export const TRAIT_GROUPS: TraitGroup[] = [
    {
        name: "Power & Stability",
        description: "Lag intolerance, thermal tolerance, performance expectations",
        traits: ["lagSensitivity", "thermalTolerance", "performanceFloor", "toleranceVariance", "benchmarkBias", "sustainedPerfWeight"],
    },
    {
        name: "Energy & Endurance",
        description: "Battery stress, charging anxiety, endurance priority",
        traits: ["batteryStress", "chargingAnxiety", "endurancePriority"],
    },
    {
        name: "Visual Perception",
        description: "Display sensitivity, camera trust, visual acuity",
        traits: ["cameraReliance", "consistencyBias", "lowLightExpectation", "visualAcuity", "displayPriority"],
    },
    {
        name: "Longevity & Regret",
        description: "Upgrade horizon, buyer remorse profile, regret sensitivity",
        traits: ["longevityExpectation", "depreciationSensitivity", "OSSupportWeight", "regretAversion", "overbuyPenalty", "posteriorConfidence"],
    },
    {
        name: "Behavioral Risk",
        description: "Spec chasing, brand trust, risk tolerance",
        traits: ["specChasing", "brandTrustWeight", "riskProfile", "noveltySeeking", "upgradeImpulse", "OSRiskTolerance", "softwareTrust"],
    },
    {
        name: "Practical Constraints",
        description: "Storage pressure, price pain, value sensitivity",
        traits: ["storageAnxiety", "futureGrowthWeight", "priceElasticity", "valueSensitivity", "valueElasticity", "premiumTolerance"],
    },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a neutral trait vector (0.5 for all traits)
 */
export function createNeutralVector(): TraitVector {
    const vector: Partial<TraitVector> = {};
    for (const trait of TRAIT_NAMES) {
        vector[trait] = 0.5;
    }
    return vector as TraitVector;
}

/**
 * Apply delta to trait vector with clamping
 */
export function applyDelta(vector: TraitVector, delta: TraitDelta): TraitVector {
    const result = { ...vector };

    for (const [key, change] of Object.entries(delta)) {
        // Skip non-trait fields
        if (key === "regretTrigger" || key === "posteriorLock") continue;

        const trait = key as TraitName;
        if (trait in result && typeof change === "number") {
            // Apply delta and clamp to 0-1
            result[trait] = Math.max(0, Math.min(1, result[trait] + change));
        }
    }

    return result;
}

/**
 * Calculate entropy of a trait vector (for convergence check)
 * Lower entropy = more confident (traits further from 0.5)
 */
export function calculateEntropy(vector: TraitVector): number {
    let totalDeviation = 0;
    let count = 0;

    for (const trait of TRAIT_NAMES) {
        const value = vector[trait] ?? 0.5;
        // Deviation from neutral
        const deviation = Math.abs(value - 0.5);
        totalDeviation += deviation;
        count++;
    }

    // Inverse: high deviation = low entropy = high confidence
    const avgDeviation = totalDeviation / count;
    return 1 - (avgDeviation * 2); // Normalized to 0-1, lower is more converged
}

/**
 * Check if quiz should stop early based on convergence
 */
export function hasConverged(vector: TraitVector, threshold: number = 0.3): boolean {
    const entropy = calculateEntropy(vector);
    return entropy < threshold;
}

/**
 * Get trait strength indicators for debugging
 */
export function getTraitStrengths(vector: TraitVector): { trait: TraitName; value: number; strength: string }[] {
    return TRAIT_NAMES.map(trait => {
        const value = vector[trait];
        let strength: string;
        if (value >= 0.8) strength = "very high";
        else if (value >= 0.65) strength = "high";
        else if (value >= 0.35) strength = "neutral";
        else if (value >= 0.2) strength = "low";
        else strength = "very low";

        return { trait, value, strength };
    }).filter(t => t.value > 0.65 || t.value < 0.35); // Only significant deviations
}
