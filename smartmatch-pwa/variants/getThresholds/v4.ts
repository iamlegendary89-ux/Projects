// VARIANT 4: Factory with defaults - maximum DRY
// Uses spread operator for cleaner merging

const DEFAULTS = { wordCount: { min: 2000, max: 7875 }, fileSize: { min: 12, max: 80 }, minContentLength: 500 };

const OVERRIDES: Record<string, Partial<typeof DEFAULTS>> = {
    specs: { wordCount: { min: 500, max: 1200 }, fileSize: { min: 3, max: 6 }, minContentLength: 200 },
    dxomark: { wordCount: { min: 200, max: 1000 }, fileSize: { min: 4, max: 12 }, minContentLength: 200 },
    gsmarena: { wordCount: { min: 2000, max: 27000 } },
    notebookcheck: { wordCount: { min: 2000, max: 27000 } },
    techradar: { wordCount: { min: 2000, max: 13500 } },
    phonearena: { wordCount: { min: 2000, max: 10500 } },
    androidcentral: { wordCount: { min: 2000, max: 10500 } },
    theverge: { wordCount: { min: 2000, max: 9000 } },
};

export function getThresholds(type: string) {
    for (const [key, override] of Object.entries(OVERRIDES)) {
        if (type.includes(key)) {
            return { ...DEFAULTS, ...override, wordCount: { ...DEFAULTS.wordCount, ...override.wordCount } };
        }
    }
    return DEFAULTS;
}
