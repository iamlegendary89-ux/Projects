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
    hasConverged,
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
}

// =============================================================================
// QUIZ STEP HANDLER (Form Action)
// =============================================================================

export async function submitQuizStep(formData: FormData) {
    const step = parseInt(formData.get("step") as string) || 1;
    const mode = formData.get("mode") as string || "ultra-fast";
    const totalQuestions = parseInt(formData.get("totalQuestions") as string) || 9;

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

    // Check for early convergence (Ultra-Fast only)
    const canStopEarly = mode === "ultra-fast" && step >= 8 && hasConverged(traits, 0.25);

    // Check if done
    if (step >= totalQuestions || canStopEarly) {
        const params = new URLSearchParams({
            traits: JSON.stringify(traits),
            mode,
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
    mode: "ultra-fast" | "gold-standard" = "ultra-fast"
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

    // 2. Synthesize attribute weights
    const attrWeights = synthesizeAttributes(traits);
    const normalizedWeights = normalizeAttributes(attrWeights);
    const topAttrs = getTopAttributes(attrWeights, 3);

    // 3. Get phones from database
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
        };
    }

    // 4. Score each phone
    const scored = phones.map((phone) => {
        let matchScore = 0;
        const reasons: string[] = [];
        const regretWarnings: string[] = [];

        // Phone attribute scores
        const phoneAttrs: Record<AttributeName, number> = {
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
            const phoneScore = phoneAttrs[attr as AttributeName] || 5;
            matchScore += phoneScore * weight;
        }

        // Generate reasons from top attributes
        for (const attr of topAttrs) {
            const score = phoneAttrs[attr];
            if (score >= 8.5) {
                reasons.push(`Exceptional ${getAttributeLabel(attr).toLowerCase()}`);
            } else if (score >= 7.5) {
                reasons.push(`Strong ${getAttributeLabel(attr).toLowerCase()}`);
            }
        }

        // Add archetype-aligned reason
        reasons.push(`Well-suited for ${archetype.profile.label.toLowerCase()}s`);

        // Check for regret risks based on trait profile
        if (traits.batteryStress > 0.7 && parseFloat(phone.batteryScore || "5") < 7) {
            regretWarnings.push("Battery may not meet your expectations");
        }
        if (traits.cameraReliance > 0.7 && parseFloat(phone.cameraScore || "5") < 7) {
            regretWarnings.push("Camera quality may disappoint");
        }
        if (traits.lagSensitivity > 0.7 && parseFloat(phone.performanceScore || "5") < 8) {
            regretWarnings.push("Performance may feel sluggish over time");
        }

        return {
            phone: {
                id: phone.id,
                name: phone.model,
                brand: phone.brand,
                score: phone.overallScore,
            },
            matchScore,
            matchPercent: Math.min(Math.round(matchScore * 10 + 5), 99),
            reasons: reasons.slice(0, 4),
            regretWarnings,
        };
    });

    // 5. Sort and return best
    scored.sort((a, b) => b.matchScore - a.matchScore);
    const best = scored[0];

    // Adjust confidence based on mode
    const modeBonus = mode === "gold-standard" ? 0.05 : 0;
    const finalConfidence = Math.min(archetype.confidence + modeBonus, 0.99);

    return {
        ...best,
        archetype,
        topAttributes: topAttrs.map(a => ({ name: a, label: getAttributeLabel(a) })),
        mode,
        confidence: finalConfidence,
    };
}
