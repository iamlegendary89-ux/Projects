// VARIANT 2: Single switch-style early return - cleaner flow

export function getThresholds(type: string) {
    if (type.includes("specs")) {
        return { wordCount: { min: 500, max: 1200 }, fileSize: { min: 3, max: 6 }, minContentLength: 200 };
    }

    if (type.includes("dxomark")) {
        return { wordCount: { min: 200, max: 1000 }, fileSize: { min: 4, max: 12 }, minContentLength: 200 };
    }

    // Review - compute max based on source
    const max = type.includes("gsmarena") || type.includes("notebookcheck") ? 27000
        : type.includes("techradar") ? 13500
            : type.includes("phonearena") || type.includes("androidcentral") ? 10500
                : type.includes("theverge") ? 9000
                    : 7875;

    return { wordCount: { min: 2000, max }, fileSize: { min: 12, max: 80 }, minContentLength: 500 };
}
