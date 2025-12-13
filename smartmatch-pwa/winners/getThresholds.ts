// VARIANT 1: Lookup table approach - O(1) after initial match
// Eliminates nested if/else, uses data-driven configuration

interface Thresholds {
    wordCount: { min: number; max: number };
    fileSize: { min: number; max: number };
    minContentLength: number;
}

const THRESHOLD_CONFIG: Record<string, Thresholds> = {
    specs: { wordCount: { min: 500, max: 1200 }, fileSize: { min: 3, max: 6 }, minContentLength: 200 },
    dxomark: { wordCount: { min: 200, max: 1000 }, fileSize: { min: 4, max: 12 }, minContentLength: 200 },
};

const REVIEW_MAX_WORDS: Record<string, number> = {
    gsmarena: 27000, notebookcheck: 27000,
    techradar: 13500,
    phonearena: 10500, androidcentral: 10500,
    theverge: 9000,
};

export function getThresholds(type: string): Thresholds {
    // Check special types first
    for (const [key, config] of Object.entries(THRESHOLD_CONFIG)) {
        if (type.includes(key)) return config;
    }

    // Find max words for source
    const maxWords = Object.entries(REVIEW_MAX_WORDS)
        .find(([key]) => type.includes(key))?.[1] || 7875;

    return { wordCount: { min: 2000, max: maxWords }, fileSize: { min: 12, max: 80 }, minContentLength: 500 };
}
