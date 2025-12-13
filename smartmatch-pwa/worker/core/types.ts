
export type Attribute =
    | "Camera"
    | "BatteryEndurance"
    | "Performance"
    | "Display"
    | "SoftwareExperience"
    | "DesignBuild"
    | "LongevityValue";

export const ATTRIBUTES: Attribute[] = [
    "Camera", "BatteryEndurance", "Performance", "Display", "SoftwareExperience", "DesignBuild", "LongevityValue"
];

export interface Mindprint {
    // 28 dimensions
    mu: number[]; // 0..1
    sigma: number[]; // Standard Deviation (used by Onyx V5/Blueprint)
    var?: number[]; // Legacy Variance (sigma^2)
}

export interface Archetype {
    id: string;
    name: string;
    signature: Record<Attribute, number>; // 7 traits
}

export interface UserVector {
    vector: number[];
}

export interface PhoneProfile {
    id: string;
    brand: string;
    model: string;
    attributes: Record<Attribute, number>;
    latentSignature: number[];
    price_usd: number;
    flags: string[];
}

export interface QuestionOptionImpact {
    traitIdx: number; // 0..27
    mu: number;
    var: number;
}

export interface QuestionOption {
    id: string;
    text: string;
    impacts: QuestionOptionImpact[];
}

export interface Question {
    id: string;
    text: string;
    category?: 'discriminator' | 'clarifier' | 'dealbreaker' | 'tie_breaker';
    options: QuestionOption[];
    expected_entropy_reduction?: number;
}

export interface SessionState {
    sessionId: string;
    step: number; // 0..11
    mindprint: Mindprint;
    archetypeProb?: number[]; // length = number of archetypes
    answers: Record<string, string>; // questionId -> optionId
    dealbreakers: {
        os_only: 'ios' | 'android' | null;
        max_size: 'small' | 'medium' | 'large' | null;
        budget_cap: number | null;
    };
}

export interface RerankResult {
    phoneId: string;
    score: number;
    components: {
        psych: number;
        mag: number;
        satisfaction: number;
        arch: number;
        regret: number;
    };
    confidence: number;
    explanation: {
        topContributing: string[]; // e.g. "Camera (40%)"
        matches: string[];
        shortfalls: string[];
        regretWarning?: string;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    regretData?: any;
}
