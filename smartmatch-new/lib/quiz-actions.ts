"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { dynamicPhones } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

import {
    type TraitVector,
    type TraitDelta,
    createNeutralVector,
    applyDelta,
    calculateEntropy,
} from "@/lib/core/traits";

import {
    projectArchetype,
    type ArchetypeResult,
} from "@/lib/core/archetypes";

import {
    synthesizeAttributes,
    normalizeAttributes,
    getTopAttributes,
    getAttributeLabel,
    type AttributeVector,
    type AttributeName,
} from "@/lib/core/synthesizer";

// =============================================================================
// TYPES
// =============================================================================

export interface MatchResult {
    phone: {
        id: string;
        name: string;
        brand: string;
        score: string | null;
    };
    matchScore: number;
    matchPercent: number;
    reasons: string[];
    archetype: ArchetypeResult;
    topAttributes: { name: AttributeName; label: string }[];
    mode: "ultra-fast" | "gold-standard";
    confidence: number;
    regretWarnings: string[];
    regretProfile: Record<string, number>;
    stoppedEarly: boolean;
    questionsAnswered: number;
}

// =============================================================================
// REGRET DIMENSIONS (5 Core)
// =============================================================================

const REGRET_DIMENSIONS = ["battery", "performance", "camera", "price", "longevity"] as const;
type RegretDimension = typeof REGRET_DIMENSIONS[number];

interface RegretProfile {
    [key: string]: number;
}

// Regret time curves (when regret peaks)
const REGRET_TIMING: Record<RegretDimension, { peakMonth: number; weight: number }> = {
    battery: { peakMonth: 1, weight: 1.2 },      // Emerges month 1
    performance: { peakMonth: 0.5, weight: 1.0 }, // Spikes early (week 1-2)
    camera: { peakMonth: 3, weight: 0.9 },       // Event-driven (holidays)
    price: { peakMonth: 0.5, weight: 1.3 },      // Strongest at purchase + month 1
    longevity: { peakMonth: 6, weight: 1.1 },    // Month 6+
};

// =============================================================================
// ADAPTIVE STOPPING LOGIC
// =============================================================================

interface ConvergenceState {
    previousTop3: string[];
    currentTop3: string[];
    top3StableCount: number;
    maxTraitDelta: number;
    regretVariance: number;
}

/**
 * Check if quiz should stop early based on entropy convergence
 */
function shouldStopEarly(
    traits: TraitVector,
    mode: string,
    step: number,
    minQuestions: number,
    prevTop3: string[] = []
): { stop: boolean; reason: string } {
    // Never stop before minimum
    if (step < minQuestions) {
        return { stop: false, reason: "below minimum" };
    }

    // Calculate entropy (lower = more converged)
    const entropy = calculateEntropy(traits);

    // Ultra-fast: more aggressive stopping
    const entropyThreshold = mode === "ultra-fast" ? 0.25 : 0.20;

    if (entropy < entropyThreshold) {
        return { stop: true, reason: "entropy converged" };
    }

    // Check trait stability (max delta from neutral)
    let maxDeviation = 0;
    let deviationCount = 0;

    for (const value of Object.values(traits)) {
        const deviation = Math.abs(value - 0.5);
        if (deviation > 0.2) deviationCount++;
        if (deviation > maxDeviation) maxDeviation = deviation;
    }

    // If many traits have strong signals, we've converged
    if (deviationCount >= 8 && maxDeviation > 0.25) {
        return { stop: true, reason: "strong trait signals" };
    }

    return { stop: false, reason: "not converged" };
}

// =============================================================================
// REGRET MODELING
// =============================================================================

/**
 * Build regret profile from trait vector
 */
function buildRegretProfile(traits: TraitVector): RegretProfile {
    const profile: RegretProfile = {};

    // Battery regret
    profile.battery = (
        (traits.batteryAnxiety || 0.5) * 0.5 +
        (traits.batteryStress || 0.5) * 0.3 +
        (traits.chargingAnxiety || 0.5) * 0.2
    );

    // Performance regret
    profile.performance = (
        (traits.lagSensitivity || 0.5) * 0.4 +
        (traits.benchmarkBias || 0.5) * 0.3 +
        (traits.performanceFloor || 0.5) * 0.3
    );

    // Camera regret
    profile.camera = (
        (traits.cameraReliance || 0.5) * 0.5 +
        (traits.visualAcuity || 0.5) * 0.3 +
        (traits.lowLightExpectation || 0.5) * 0.2
    );

    // Price regret
    profile.price = (
        (traits.valueElasticity || 0.5) * 0.4 +
        (traits.valueSensitivity || 0.5) * 0.3 +
        (traits.overbuyPenalty || 0.5) * 0.3
    );

    // Longevity regret
    profile.longevity = (
        (traits.longevityExpectation || 0.5) * 0.4 +
        (traits.depreciationSensitivity || 0.5) * 0.3 +
        (traits.OSSupportWeight || 0.5) * 0.3
    );

    return profile;
}

/**
 * Calculate regret penalty for a phone based on user's regret profile
 */
function calculateRegretPenalty(
    phoneAttrs: Record<string, number>,
    regretProfile: RegretProfile,
    traits: TraitVector
): { penalty: number; warnings: string[] } {
    let penalty = 0;
    const warnings: string[] = [];
    const regretThreshold = 0.65;

    // Battery regret
    if (regretProfile.battery > regretThreshold && phoneAttrs.battery < 7) {
        penalty += (regretThreshold - phoneAttrs.battery / 10) * REGRET_TIMING.battery.weight;
        warnings.push("Battery may not meet your expectations");
    }

    // Performance regret
    if (regretProfile.performance > regretThreshold && phoneAttrs.performance < 7.5) {
        penalty += (regretThreshold - phoneAttrs.performance / 10) * REGRET_TIMING.performance.weight;
        warnings.push("Performance may feel sluggish over time");
    }

    // Camera regret
    if (regretProfile.camera > regretThreshold && phoneAttrs.camera < 7) {
        penalty += (regretThreshold - phoneAttrs.camera / 10) * REGRET_TIMING.camera.weight;
        warnings.push("Camera quality may disappoint");
    }

    // Apply regret aversion buffer for sensitive users
    if ((traits.regretAversion || 0.5) > 0.7) {
        penalty *= 1.3; // Conservative bias
        if (warnings.length === 0) {
            // Add general warning for regret-averse users on edge cases
        }
    }

    return { penalty, warnings };
}

// =============================================================================
// QUIZ STEP HANDLER (Form Action)
// =============================================================================

export async function submitQuizStep(formData: FormData) {
    const step = parseInt(formData.get("step") as string) || 1;
    const mode = (formData.get("mode") as string) || "ultra-fast";
    const totalQuestions = parseInt(formData.get("totalQuestions") as string) || 9;
    const minQuestions = mode === "ultra-fast" ? 6 : 10;

    // Get current traits
    const traitsJson = formData.get("traits") as string;
    let traits: TraitVector = traitsJson
        ? JSON.parse(traitsJson)
        : createNeutralVector();

    // Apply delta from answer
    const deltaJson = formData.get("delta") as string;
    if (deltaJson) {
        const delta: TraitDelta = JSON.parse(deltaJson);
        traits = applyDelta(traits, delta);
    }

    // Get answered questions
    const answeredJson = formData.get("answered") as string;
    const questionId = formData.get("questionId") as string;
    const answered: string[] = answeredJson ? JSON.parse(answeredJson) : [];
    if (questionId && !answered.includes(questionId)) {
        answered.push(questionId);
    }

    // Check for adaptive early stopping
    const convergence = shouldStopEarly(traits, mode, step, minQuestions);

    if (step >= totalQuestions || convergence.stop) {
        const params = new URLSearchParams({
            traits: JSON.stringify(traits),
            mode,
            stopped: convergence.stop ? "early" : "complete",
            questions: String(step),
        });
        redirect(`/result?${params.toString()}`);
    }

    // Continue to next question
    const params = new URLSearchParams({
        step: String(step + 1),
        mode,
        traits: JSON.stringify(traits),
        answered: JSON.stringify(answered),
    });
    redirect(`/quiz?${params.toString()}`);
}

// =============================================================================
// QUIZ RESULT CALCULATOR
// =============================================================================

export async function getQuizResult(
    traitsJson: string,
    mode: "ultra-fast" | "gold-standard" = "ultra-fast",
    stoppedEarly: boolean = false,
    questionsAnswered: number = 9
): Promise<MatchResult> {
    // Parse traits
    let traits: TraitVector;
    try {
        traits = JSON.parse(traitsJson);
    } catch {
        traits = createNeutralVector();
    }

    // 1. Project archetype
    const archetype = projectArchetype(traits);

    // 2. Build regret profile
    const regretProfile = buildRegretProfile(traits);

    // 3. Synthesize attribute weights
    const attrWeights = synthesizeAttributes(traits);
    const normalizedWeights = normalizeAttributes(attrWeights);
    const topAttrs = getTopAttributes(attrWeights, 3);

    // 4. Get phones from database
    const phones = await db
        .select()
        .from(dynamicPhones)
        .orderBy(desc(dynamicPhones.overallScore));

    if (phones.length === 0) {
        return {
            phone: { id: "", name: "No phones available", brand: "", score: null },
            matchScore: 0,
            matchPercent: 0,
            reasons: ["Database is empty"],
            archetype,
            topAttributes: topAttrs.map(a => ({ name: a, label: getAttributeLabel(a) })),
            mode,
            confidence: 0,
            regretWarnings: [],
            regretProfile,
            stoppedEarly,
            questionsAnswered,
        };
    }

    // 5. Score each phone with regret modeling
    const scored = phones.map((phone) => {
        let matchScore = 0;
        const reasons: string[] = [];

        // Phone attribute scores
        const phoneAttrs: Record<string, number> = {
            performance: parseFloat(phone.performanceScore || "5"),
            camera: parseFloat(phone.cameraScore || "5"),
            battery: parseFloat(phone.batteryScore || "5"),
            display: parseFloat(phone.displayScore || "5"),
            software: parseFloat(phone.softwareScore || "5"),
            design: parseFloat(phone.designScore || "5"),
            value: 10 - parseFloat(phone.overallScore || "5") * 0.5,
        };

        // Weighted match
        for (const [attr, weight] of Object.entries(normalizedWeights)) {
            const phoneScore = phoneAttrs[attr] || 5;
            matchScore += phoneScore * weight;
        }

        // Apply regret penalty
        const { penalty, warnings } = calculateRegretPenalty(phoneAttrs, regretProfile, traits);
        matchScore -= penalty;

        // Generate reasons from top attributes
        for (const attr of topAttrs) {
            const score = phoneAttrs[attr];
            if (score >= 8.5) {
                reasons.push(`Exceptional ${getAttributeLabel(attr as AttributeName).toLowerCase()}`);
            } else if (score >= 7.5) {
                reasons.push(`Strong ${getAttributeLabel(attr as AttributeName).toLowerCase()}`);
            }
        }

        // Add archetype reason
        reasons.push(`Great fit for ${archetype.profile.label.toLowerCase()}s`);

        return {
            phone: {
                id: phone.id,
                name: phone.model,
                brand: phone.brand,
                score: phone.overallScore,
            },
            matchScore,
            matchPercent: Math.max(50, Math.min(Math.round(matchScore * 10 + 5), 99)),
            reasons: reasons.slice(0, 4),
            regretWarnings: warnings,
        };
    });

    // 6. Sort and return best
    scored.sort((a, b) => b.matchScore - a.matchScore);
    const best = scored[0];

    // Adjust confidence based on mode and stopping
    const modeBonus = mode === "gold-standard" ? 0.05 : 0;
    const earlyPenalty = stoppedEarly ? 0.02 : 0;
    const finalConfidence = Math.min(archetype.confidence + modeBonus - earlyPenalty, 0.99);

    return {
        ...best,
        archetype,
        topAttributes: topAttrs.map(a => ({ name: a, label: getAttributeLabel(a) })),
        mode,
        confidence: finalConfidence,
        regretProfile,
        stoppedEarly,
        questionsAnswered,
    };
}
