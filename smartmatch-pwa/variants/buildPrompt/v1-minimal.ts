/**
 * V1 Minimal - Token-efficient prompt (~40% shorter)
 * Strategy: Remove redundancy, use terse instructions
 * Goal: Lower cost, faster response, test if LLM still performs
 */
export function buildPrompt(reviewCount: number, phoneName: string, reviewsText: string): string {
    return `Analyze ${reviewCount} reviews for ${phoneName}. Output JSON only.

EXTRACT:
- antutu, geekbench: from GSMArena specs
- dxocamera, dxodisplay: from DXOMark
- batteryActiveUse: hours (e.g. 16.5)
- softwareSupportYears: integer
- currentPrice, launchPrice: {usd?, eur?, gbp?, inr?}

SCORE 7 ATTRIBUTES (0.00-10.00):
1. Camera (main 38%, lowlight 32%, video 20%, selfie 10%)
2. Battery Endurance (efficiency 38%, capacity 32%, charging 18%, degradation 12%)
3. Performance (sustained 44%, peak 34%, thermals 18%, npu 4%)
4. Display (eye comfort 34%, brightness 30%, color 22%, refresh 10%, hdr 4%)
5. Software Experience (clean 46%, updates 28%, features 18%, bugs 8%)
6. Design & Build (weight 38%, materials 34%, haptics 18%, durability 10%)
7. Longevity Value (policy 58%, price/perf 32%, resale 10%)

RULES:
- Weight GSMArena/DXOMark/NotebookCheck 1.5x
- 2+ source consensus for pros/cons
- Missing data → score 5.00, note "Not mentioned"
- Exactly 5 pros, 5 cons
- summary_1_page: 150-350 words

OUTPUT FORMAT:
{"summary_1_page":"...","pros":[],"cons":[],"attributes":[{"name":"Camera","score":9.12,"explanation":"..."},...],
"antutu":null,"geekbench":null,"dxocamera":null,"dxodisplay":null,"batteryActiveUse":null,
"softwareSupportYears":null,"currentPrice":{},"launchPrice":{}}

${reviewsText}`;
}
