// VARIANT 3: Regex-based pattern matching - single pass
// More flexible for future source additions

const PATTERNS = [
    { pattern: /specs/, thresholds: { wordCount: { min: 500, max: 1200 }, fileSize: { min: 3, max: 6 }, minContentLength: 200 } },
    { pattern: /dxomark/, thresholds: { wordCount: { min: 200, max: 1000 }, fileSize: { min: 4, max: 12 }, minContentLength: 200 } },
    { pattern: /gsmarena|notebookcheck/, maxWords: 27000 },
    { pattern: /techradar/, maxWords: 13500 },
    { pattern: /phonearena|androidcentral/, maxWords: 10500 },
    { pattern: /theverge/, maxWords: 9000 },
];

export function getThresholds(type: string) {
    for (const { pattern, thresholds, maxWords } of PATTERNS) {
        if (pattern.test(type)) {
            if (thresholds) return thresholds;
            if (maxWords) return { wordCount: { min: 2000, max: maxWords }, fileSize: { min: 12, max: 80 }, minContentLength: 500 };
        }
    }
    return { wordCount: { min: 2000, max: 7875 }, fileSize: { min: 12, max: 80 }, minContentLength: 500 };
}
