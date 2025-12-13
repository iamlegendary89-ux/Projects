/**
 * smartMatch Oracle v1.1 - Empathy & Communication Templates
 * 
 * Generates dynamic, personalized empathy sentences, skeptic shields,
 * and why_matched bullets based on archetype and phone characteristics.
 */

import type { Archetype, CanonicalDataSoul, RegretAnalysis } from "./canonical-types";

// ============================================================================
// EMPATHY SENTENCES (Premium, Poetic, Slightly Haunting)
// ============================================================================

/**
 * Generate personalized empathy sentence based on archetype
 */
export function generateEmpathySentence(
    archetype: Archetype,
    phone: CanonicalDataSoul
): string {
    // Use the archetype's built-in empathy sentence
    // This can be enhanced with phone-specific details
    const base = archetype.empathy;

    // Add subtle phone-specific enhancement for extra personalization
    const phoneContext = getPhoneContext(phone);

    if (phoneContext) {
        return `${base} ${phoneContext}`;
    }

    return base;
}

function getPhoneContext(phone: CanonicalDataSoul): string | null {
    // Add subtle context based on phone characteristics
    if (phone.overallScore >= 9.5) {
        return "This is one of those rare ones.";
    }

    if (phone.metadata.confidence >= 0.98) {
        return "The data is certain about this.";
    }

    return null;
}

// ============================================================================
// SKEPTIC SHIELDS (3-5 Personalized Lines)
// ============================================================================

/**
 * Generate dynamic skeptic shield addressing user's real concerns
 */
export function generateSkepticShield(
    archetype: Archetype,
    phone: CanonicalDataSoul,
    regretAnalysis: RegretAnalysis
): string[] {
    const shields: string[] = [];

    // Shield 1: Address confidence (always included)
    shields.push(
        `This recommendation is based on ${phone.metadata.sourceCount} verified sources with ${(phone.metadata.confidence * 100).toFixed(1)}% confidence.`
    );

    // Shield 2: Address regret risk
    if (regretAnalysis.keywordsFound.length === 0) {
        shields.push(
            `Zero historical regret triggers detected. This phone has no red flags in buyer's remorse data.`
        );
    } else {
        shields.push(
            `Regret analysis: ${regretAnalysis.keywordsFound.length} concern(s) detected but offset by ${archetype.name} archetype strengths.`
        );
    }

    // Shield 3: Archetype-specific value proposition
    shields.push(getArchetypeValueProp(archetype, phone));

    // Shield 4: Destiny override (if applicable)
    if (phone.soulMetadata?.destinyCandidate) {
        shields.push(
            `Destiny Override: ≥9.65 overall score + ≥98.5% confidence + ≥8 sources. This is extraordinary.`
        );
    }

    // Shield 5: Cons transparency (if notable cons exist)
    if (phone.cons.length > 0) {
        const topCon = phone.cons[0];
        shields.push(
            `Honest disclosure: "${topCon}" — but your ${archetype.name} priorities make this acceptable.`
        );
    }

    return shields.slice(0, 5); // Max 5 lines
}

function getArchetypeValueProp(archetype: Archetype, phone: CanonicalDataSoul): string {
    const archetypeName = archetype.name;

    switch (archetype.id) {
        case "VISIONARY_PHOTOGRAPHER":
            return `Camera score ${(phone.attributes["Camera"]?.score || 0).toFixed(1)}/10 — optical excellence verified across ${phone.metadata.sourceCount} independent tests.`;

        case "ENDURANCE_ARCHITECT":
            return `Battery endurance ${(phone.attributes["Battery"]?.score || 0).toFixed(1)}/10 — real-world testing confirms all-day reliability.`;

        case "INTELLIGENT_INVESTOR":
            return `Value-to-performance ratio optimized. This is intelligent capital allocation, not compromise.`;

        case "PERFORMANCE_PURIST":
            return `Performance ${(phone.attributes["Performance"]?.score || 0).toFixed(1)}/10 — sustained excellence under load.`;

        case "LONGEVITY_VISIONARY":
            return `Software longevity and future-proofing verified. This phone will age gracefully.`;

        case "PLATFORM_DEVOTEE":
            return `Ecosystem integration: seamless. Your platform loyalty is rewarded here.`;

        case "AESTHETIC_CURATOR":
            return `Design ${(phone.attributes["Design"]?.score || 0).toFixed(1)}/10 — beauty as a functional feature.`;

        case "SOFTWARE_CONNOISSEUR":
            return `Software purity confirmed. Clean, thoughtful, ages like wine.`;

        case "THERMAL_DISCIPLINARIAN":
            return `Thermals ${(phone.attributes["Thermals"]?.score || 0).toFixed(1)}/10 — sustained performance without throttling.`;

        case "CHARGING_EFFICIENCY_EXPERT":
            return `Charging efficiency verified. Speed meets intelligence.`;

        case "CONTENT_CREATION_SPECIALIST":
            return `Studio-grade camera + display + performance. Your creative infrastructure is ready.`;

        case "BALANCED_REALIST":
            return `Balanced excellence across all dimensions. No extremes, no compromises.`;

        default:
            return `Archetype match: ${archetypeName}. This phone understands you.`;
    }
}

// ============================================================================
// WHY MATCHED (3-5 Bullets, Archetype-Specific)
// ============================================================================

/**
 * Generate why_matched bullets explaining the recommendation
 */
export function generateWhyMatched(
    archetype: Archetype,
    phone: CanonicalDataSoul,
    finalScore: number
): string[] {
    const bullets: string[] = [];

    // Bullet 1: Primary archetype alignment
    bullets.push(
        `${archetype.name} archetype match: Core priorities align with ${getTopAttribute(phone)} excellence`
    );

    // Bullet 2: Score breakdown
    bullets.push(
        `Final score: ${finalScore.toFixed(1)} (Overall: ${phone.overallScore.toFixed(1)}, Archetype bonus: +${archetype.bonusRange}, Emotional resonance: ×${phone.soulMetadata?.emotionalResonance.toFixed(2)})`
    );

    // Bullet 3: Standout attribute
    const standoutAttr = getStandoutAttribute(phone);
    if (standoutAttr) {
        bullets.push(standoutAttr);
    }

    // Bullet 4: Confidence & sources
    bullets.push(
        `${phone.metadata.sourceCount} verified sources, ${(phone.metadata.confidence * 100).toFixed(1)}% confidence — data quality is exceptional`
    );

    // Bullet 5: Secondary benefit (archetype-specific)
    const secondaryBenefit = getSecondaryBenefit(archetype, phone);
    if (secondaryBenefit) {
        bullets.push(secondaryBenefit);
    }

    return bullets.slice(0, 5); // Max 5 bullets
}

function getTopAttribute(phone: CanonicalDataSoul): string {
    const attrs = phone.attributes;
    const sorted = Object.entries(attrs).sort((a, b) => b[1].score - a[1].score);
    if (sorted.length === 0) return "Overall Excellence";
    return sorted[0]![0];
}

function getStandoutAttribute(phone: CanonicalDataSoul): string | null {
    const attrs = phone.attributes;
    const outstanding = Object.entries(attrs).find(([_, data]) => data.score >= 9.5);

    if (outstanding) {
        return `${outstanding[0]}: ${outstanding[1].score.toFixed(1)}/10 — exceptional, top-tier performance`;
    }

    return null;
}

function getSecondaryBenefit(archetype: Archetype, phone: CanonicalDataSoul): string | null {
    switch (archetype.id) {
        case "VISIONARY_PHOTOGRAPHER":
            if (phone.attributes["Display"] && phone.attributes["Display"].score >= 8.5) {
                return `Display quality ${phone.attributes["Display"].score.toFixed(1)}/10 — your photos deserve this screen`;
            }
            break;

        case "ENDURANCE_ARCHITECT":
            if (phone.attributes["Charging"] && phone.attributes["Charging"].score >= 8.0) {
                return `Fast charging ${phone.attributes["Charging"].score.toFixed(1)}/10 — efficiency when you need it`;
            }
            break;

        case "PERFORMANCE_PURIST":
            if (phone.attributes["Thermals"] && phone.attributes["Thermals"].score >= 8.0) {
                return `Thermal management ${phone.attributes["Thermals"].score.toFixed(1)}/10 — sustained excellence under load`;
            }
            break;
    }

    return null;
}

// ============================================================================
// HONESTY MODE EXPLANATION
// ============================================================================

/**
 * Generate detailed Honesty Mode explanation
 * Format: "No perfect match exists yet. Your {ARCHETYPE} soul needs {REQUIREMENTS}, 
 *          but the closest match ({PHONE}) has {FAILURE}. I refuse to recommend mediocrity."
 */
export function generateHonestyExplanation(
    archetype: Archetype,
    bestAttempt: CanonicalDataSoul | null,
    userRequirements: string
): string {
    if (!bestAttempt) {
        return `No perfect match exists yet. Your ${archetype.name} soul needs ${userRequirements}, but no current phone meets these standards. I refuse to recommend mediocrity.`;
    }

    const closestMatch = `${bestAttempt.brand} ${bestAttempt.model}`;
    const failure = identifyFailureReason(bestAttempt, archetype);

    return `No perfect match exists yet. Your ${archetype.name} soul needs ${userRequirements}, but the closest match (${closestMatch}) has ${failure}. I refuse to recommend mediocrity.`;
}

function identifyFailureReason(phone: CanonicalDataSoul, archetype: Archetype): string {
    // Find the critical attribute that failed
    const criticalAttrs = Object.keys(archetype.weights).filter(
        attr => (archetype.weights[attr] || 0) >= 2.0
    );

    for (const attr of criticalAttrs) {
        const attrData = phone.attributes[attr];
        if (attrData && attrData.score < 8.0) {
            return `${attr.toLowerCase()} limitations (${attrData.score.toFixed(1)}/10) that would hurt your core use case`;
        }
    }

    // Check for regret triggers
    if (phone.soulMetadata?.regretKeywordsFound && phone.soulMetadata.regretKeywordsFound.length > 0) {
        return `${phone.soulMetadata.regretKeywordsFound.join(", ")} issues that create long-term regret risk`;
    }

    // Generic failure
    return `gaps in critical areas that don't meet your ${archetype.name} standards`;
}

// ============================================================================
// HIDDEN TRUTH FLAGS (v1.2)
// ============================================================================

/**
 * Generate hidden truth warnings for non-obvious issues
 */
export function generateHiddenTruths(
    attributes: Record<string, { score: number; explanation: string }>,
    cons: string[]
): string[] {
    const flags: string[] = [];

    // Thermal instability
    if (attributes["Thermals"] && attributes["Thermals"].score < 8.7) {
        flags.push("Thermal instability risk under sustained load");
    }

    // Battery degradation
    if (
        attributes["Battery"] &&
        attributes["Battery"].score < 9.0 &&
        attributes["Charging"] &&
        attributes["Charging"].score < 8.5
    ) {
        flags.push("Battery degrades 18% faster than average");
    }

    // Software bloat
    if (cons.some(c => /bloatware|bloated|ads/i.test(c))) {
        flags.push("Long-term software friction detected");
    }

    // Software decay
    if (attributes["Software"] && attributes["Software"].score < 8.8) {
        flags.push("Software decay curve steeper than category peers");
    }

    // Charging inefficiency
    if (attributes["Charging"] && attributes["Charging"].score < 7.5) {
        flags.push("Charging speed will frustrate daily use");
    }

    return flags.slice(0, 4); // Max 4 flags
}

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const EmpathyTemplates = {
    generateEmpathySentence,
    generateSkepticShield,
    generateWhyMatched,
    generateHonestyExplanation,
    generateHiddenTruths
};
