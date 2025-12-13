/**
 * V6 JSON Schema First - Lead with exact schema, instructions after
 * Strategy: Schema-first approach for strict format compliance
 * Goal: Minimize parsing errors, ensure type correctness
 */
export function buildPrompt(reviewCount: number, phoneName: string, reviewsText: string): string {
    return `OUTPUT THIS EXACT JSON SCHEMA (no other text):

{
  "summary_1_page": string (150-350 words),
  "pros": [string, string, string, string, string],
  "cons": [string, string, string, string, string],
  "attributes": [
    {"name": "Camera", "score": float, "explanation": string},
    {"name": "Battery Endurance", "score": float, "explanation": string},
    {"name": "Performance", "score": float, "explanation": string},
    {"name": "Display", "score": float, "explanation": string},
    {"name": "Software Experience", "score": float, "explanation": string},
    {"name": "Design & Build", "score": float, "explanation": string},
    {"name": "Longevity Value", "score": float, "explanation": string}
  ],
  "antutu": int | null,
  "geekbench": int | null,
  "dxocamera": int | null,
  "dxodisplay": int | null,
  "batteryActiveUse": float | null,
  "softwareSupportYears": int | null,
  "currentPrice": {"usd"?: string, "eur"?: string, "gbp"?: string, "inr"?: string},
  "launchPrice": {"usd"?: string, "eur"?: string, "gbp"?: string, "inr"?: string}
}

CONSTRAINTS:
- score: 0.00 to 10.00 (2 decimal precision)
- explanation: minimum 20 characters
- pros/cons: exactly 5 items each, cite 2+ sources per item
- antutu/geekbench: extract from GSMArena specs
- dxocamera/dxodisplay: extract from DXOMark
- batteryActiveUse: decimal hours (e.g., "16:30h" → 16.5)

PHONE: ${phoneName}
SOURCES: ${reviewCount}

SCORING WEIGHTS:
Camera = main(38%) + lowlight(32%) + video(20%) + selfie(10%)
Battery = efficiency(38%) + capacity(32%) + charging(18%) + degradation(12%)
Performance = sustained(44%) + peak(34%) + thermals(18%) + npu(4%)
Display = comfort(34%) + brightness(30%) + color(22%) + refresh(10%) + hdr(4%)
Software = clean(46%) + updates(28%) + features(18%) + bugs(8%)
Design = weight(38%) + materials(34%) + haptics(18%) + durability(10%)
Longevity = policy(58%) + price_perf(32%) + resale(10%)

SOURCE WEIGHTS: GSMArena/DXOMark/NotebookCheck = 1.5x, others = 1.0x
MISSING DATA: score = 5.00, explanation = "Not mentioned in any reviews"

REVIEWS:
${reviewsText}`;
}
