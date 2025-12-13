/**
 * R.E.A.L.™ Attribute Synthesizer
 * 
 * Projects latent traits onto 7 phone attributes
 * Each attribute importance is derived from user's trait profile
 */

import type { TraitVector, TraitName } from "./traits";

// =============================================================================
// ATTRIBUTE DEFINITIONS (7)
// =============================================================================

export const ATTRIBUTE_NAMES = [
    "performance",
    "camera",
    "battery",
    "display",
    "software",
    "design",
    "value",
] as const;

export type AttributeName = typeof ATTRIBUTE_NAMES[number];

export type AttributeVector = Record<AttributeName, number>;

// =============================================================================
// TRAIT → ATTRIBUTE WEIGHT MATRIX (REAL-aligned)
// =============================================================================

export const ATTRIBUTE_WEIGHTS: Record<AttributeName, Partial<Record<TraitName, number>>> = {
    performance: {
        lagSensitivity: 0.30,
        benchmarkBias: 0.25,
        thermalTolerance: 0.15,
        sustainedPerfWeight: 0.15,
        performanceFloor: 0.10,
        patience: -0.05,
    },
    camera: {
        cameraReliance: 0.40,
        visualAcuity: 0.20,
        lowLightExpectation: 0.15,
        consistencyBias: 0.15,
        aestheticAttachment: 0.10,
    },
    battery: {
        batteryStress: 0.40,
        chargingAnxiety: 0.25,
        endurancePriority: 0.20,
        longevityBias: 0.10,
        patience: -0.05,
    },
    display: {
        visualAcuity: 0.35,
        displayPriority: 0.30,
        aestheticAttachment: 0.15,
        ergonomicsWeight: 0.10,
        designPriority: 0.10,
    },
    software: {
        softwareTrust: 0.30,
        OSRiskTolerance: 0.20,
        OSSupportWeight: 0.20,
        consistencyBias: 0.15,
        brandTrustWeight: 0.15,
    },
    design: {
        aestheticAttachment: 0.30,
        ergonomicsWeight: 0.25,
        designPriority: 0.20,
        thermalAversion: 0.15,
        premiumTolerance: 0.10,
    },
    value: {
        valueElasticity: 0.35,
        valueSensitivity: 0.25,
        priceElasticity: 0.20,
        depreciationSensitivity: 0.10,
        overbuyPenalty: 0.10,
    },
};

// =============================================================================
// SYNTHESIZER FUNCTION
// =============================================================================

/**
 * Synthesize attribute importance from trait vector
 */
export function synthesizeAttributes(traits: TraitVector): AttributeVector {
    const result: Partial<AttributeVector> = {};

    for (const attr of ATTRIBUTE_NAMES) {
        let importance = 0.5; // Start at neutral
        const weights = ATTRIBUTE_WEIGHTS[attr];

        for (const [trait, weight] of Object.entries(weights)) {
            const traitValue = traits[trait as TraitName] ?? 0.5;
            importance += (traitValue - 0.5) * (weight || 0) * 2;
        }

        result[attr] = Math.max(0, Math.min(1, importance));
    }

    return result as AttributeVector;
}

/**
 * Normalize attribute weights to sum to 1
 */
export function normalizeAttributes(attrs: AttributeVector): AttributeVector {
    const sum = Object.values(attrs).reduce((a, b) => a + b, 0);

    if (sum === 0) {
        const equalWeight = 1 / ATTRIBUTE_NAMES.length;
        return Object.fromEntries(
            ATTRIBUTE_NAMES.map(a => [a, equalWeight])
        ) as AttributeVector;
    }

    return Object.fromEntries(
        Object.entries(attrs).map(([k, v]) => [k, v / sum])
    ) as AttributeVector;
}

/**
 * Get top N attributes by importance
 */
export function getTopAttributes(attrs: AttributeVector, n: number = 3): AttributeName[] {
    return Object.entries(attrs)
        .sort(([, a], [, b]) => b - a)
        .slice(0, n)
        .map(([name]) => name as AttributeName);
}

/**
 * Get attribute explanation for display
 */
export function getAttributeLabel(attr: AttributeName): string {
    const labels: Record<AttributeName, string> = {
        performance: "Processing Power",
        camera: "Camera Quality",
        battery: "Battery Life",
        display: "Display Quality",
        software: "Software Experience",
        design: "Build & Design",
        value: "Value for Money",
    };
    return labels[attr];
}
