/**
 * smartMatch Oracle v2.2 - Extended Canonical Types
 * 
 * Extends the base CanonicalData with soul metadata for the
 * emotionally intelligent recommendation engine.
 * 
 * v2.2 Changes:
 * - 7 pure attributes (Camera, Battery Endurance, Performance, Display, 
 *   Software Experience, Design & Build, Longevity Value)
 * - Added updatesYears field for Longevity Visionary bonus
 * - MAX_SAFE_INTEGER for destiny override (bulletproof sorting)
 */

// Re-export base types (assuming they exist in your project)
// Adjust the import path based on your actual structure
export interface CanonicalData {
    phoneId: string;
    brand: string;
    model: string;
    overallScore: number;
    category: string;
    onePageSummary: string;
    pros: string[];
    cons: string[];
    attributes: Record<string, AttributeData>;
    metadata: EnrichmentMetadata;
    updatesYears?: number; // e.g. 7 for Samsung/Pixel, 5 for iPhone (v2.2)
    image?: string; // URL to local or remote image
}

export interface AttributeData {
    score: number;
    explanation: string;
}

export interface EnrichmentMetadata {
    confidence: number;
    modelUsed: string;
    processingVersion: string;
    processedAt: string;
    processingTimeMs: number;
    sourceCount: number;
    sourceNames: string[];
    sourceUrls?: string[];
    batchMode: true;
    splitMode?: boolean;
}

// ============================================================================
// smartMatch EXTENSIONS
// ============================================================================

/**
 * Premium archetype identifiers (12 total)
 */
export type ArchetypeId =
    | "VISIONARY_PHOTOGRAPHER"
    | "ENDURANCE_ARCHITECT"
    | "INTELLIGENT_INVESTOR"
    | "PERFORMANCE_PURIST"
    | "LONGEVITY_VISIONARY"
    | "PLATFORM_DEVOTEE"
    | "AESTHETIC_CURATOR"
    | "SOFTWARE_CONNOISSEUR"
    | "THERMAL_DISCIPLINARIAN"
    | "CHARGING_EFFICIENCY_EXPERT"
    | "CONTENT_CREATION_SPECIALIST"
    | "BALANCED_REALIST";

/**
 * Archetype definition
 */
export interface Archetype {
    id: ArchetypeId;
    name: string;
    tagline: string;
    bonusRange: number | string;  // number or "1.5 → 2.8" for Balanced Realist
    empathy: string;
    blendsSecondary?: boolean;     // Only true for Balanced Realist
    destiny?: boolean;             // Only true for Longevity Visionary
    weights: Record<string, number>;
}

/**
 * Soul metadata attached to each phone during scoring
 */
export interface SoulMetadata {
    archetypeMatch: number;        // 0-1, how well phone matches archetype
    emotionalResonance: number;    // 1.0-1.4 multiplier
    regretRisk: number;            // 0 to -15 (6 keywords × -2.5)
    destinyCandidate: boolean;     // True if ≥9.65 + ≥0.985 + ≥8 sources
    regretKeywordsFound: string[]; // List of regret keywords in cons
}

/**
 * Extended canonical data with soul fields
 */
export interface CanonicalDataSoul extends CanonicalData {
    soulMetadata?: SoulMetadata;
}

/**
 * User preferences for archetype detection
 */
export interface UserPreferences {
    // Core priorities
    priorities: {
        camera?: number;       // 0-10
        battery?: number;      // 0-10
        performance?: number;  // 0-10
        design?: number;       // 0-10
        software?: number;     // 0-10
        price?: number;        // 0-10
        charging?: number;     // 0-10
        thermals?: number;     // 0-10
        display?: number;
        build?: number;
        value?: number;
        materials?: number;
        ecosystem?: number;
        connectivity?: number;
        integration?: number;
        updates?: number;
        storage?: number;
        convenience?: number;
    };

    // Constraints
    maxBudget?: number;      // USD
    ecosystem?: "iOS" | "Android" | "Any";
    useCase?: "Gaming" | "Photography" | "Content Creation" | "General";

    // Concerns
    concerns?: string[];     // ["bloatware", "overheating", etc.]
}

/**
 * Archetype detection result
 */
export interface ArchetypeResult {
    primary: Archetype;
    secondary?: Archetype;   // Only for Balanced Realist
    confidence: number;      // 0-1, how confident we are in detection
}

/**
 * Regret sentiment data from social listening
 */
export interface RegretAttribute {
    regretScore: number;
    frequency: string;
    topComplaints: string[];
}

export interface RegretSentimentData {
    phoneId: string;
    totalRegretScore: number;
    attributes: Record<string, RegretAttribute>;
}

/**
 * Final SmartMatch recommendation result (v1.2)
 */
export interface SmartMatchResult {
    phoneId: string;
    brand: string;
    model: string;
    finalScore: number;           // 0-999 (NOT Infinity)
    archetype: {
        primary: string;            // Archetype name
        secondary?: string;         // Only for Balanced Realist
        tagline: string;            // From archetype definition
    };
    empathy_sentence: string;     // Personalized, poetic
    skeptic_shield: string[];     // 3-5 lines, user-specific
    why_matched: string[];        // 3-5 bullets, archetype-specific
    honesty_mode?: {
        triggered: true;
        explanation: string;        // EXACT soul need that failed
    };
    destiny_override?: boolean;   // Only if finalScore === 999

    // v1.2 Features
    fate_divergence: {
        percentage: number;           // Satisfaction drop if choosing another phone
        message: string;              // FOMO-inducing message
    };
    hidden_truths: string[];        // Non-obvious warnings (thermal, degradation)
    echo_chamber_breaker?: {
        title: string;
        text: string;
    };

    regret_analysis?: RegretSentimentData; // New detailed regret data

    data: CanonicalDataSoul;      // Full enriched data + soul metadata
}

/**
 * Regret minimization data
 */
export interface RegretAnalysis {
    totalPenalty: number;          // Sum of all penalties
    keywordsFound: string[];       // Which regret keywords were found
    affectedCons: string[];        // Which cons triggered penalties
}

/**
 * Scoring breakdown for transparency
 */
export interface ScoringBreakdown {
    baseScore: number;
    archetypeBonus: number;
    emotionalResonance: number;
    regretPenalty: number;
    finalScore: number;
    destinyOverride: boolean;
}
