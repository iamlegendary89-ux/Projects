// VARIANT 5: Functional composition - pure and testable
// Each concern is isolated

const specs = () => ({ wordCount: { min: 500, max: 1200 }, fileSize: { min: 3, max: 6 }, minContentLength: 200 });
const dxomark = () => ({ wordCount: { min: 200, max: 1000 }, fileSize: { min: 4, max: 12 }, minContentLength: 200 });
const review = (max: number) => ({ wordCount: { min: 2000, max }, fileSize: { min: 12, max: 80 }, minContentLength: 500 });

const matchers: Array<[string, () => ReturnType<typeof specs>]> = [
    ["specs", specs],
    ["dxomark", dxomark],
    ["gsmarena", () => review(27000)],
    ["notebookcheck", () => review(27000)],
    ["techradar", () => review(13500)],
    ["phonearena", () => review(10500)],
    ["androidcentral", () => review(10500)],
    ["theverge", () => review(9000)],
];

export function getThresholds(type: string) {
    const match = matchers.find(([key]) => type.includes(key));
    return match ? match[1]() : review(7875);
}
