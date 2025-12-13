/**
 * V2 Structured - XML-tagged sections for clarity
 * Strategy: Use XML tags for better parsing by LLMs
 * Goal: Improved instruction following and output compliance
 */
export function buildPrompt(reviewCount: number, phoneName: string, reviewsText: string): string {
    return `<task>
Analyze ${reviewCount} smartphone reviews and produce a synthesized JSON analysis.
</task>

<phone>${phoneName}</phone>

<output_format>
Return ONLY valid JSON with this exact structure:
{
  "summary_1_page": "150-350 word synthesis",
  "pros": ["exactly 5 items, each cited from 2+ sources"],
  "cons": ["exactly 5 items, each cited from 2+ sources"],
  "attributes": [
    {"name": "Camera", "score": 0.00-10.00, "explanation": "min 20 chars"},
    {"name": "Battery Endurance", "score": 0.00-10.00, "explanation": "..."},
    {"name": "Performance", "score": 0.00-10.00, "explanation": "..."},
    {"name": "Display", "score": 0.00-10.00, "explanation": "..."},
    {"name": "Software Experience", "score": 0.00-10.00, "explanation": "..."},
    {"name": "Design & Build", "score": 0.00-10.00, "explanation": "..."},
    {"name": "Longevity Value", "score": 0.00-10.00, "explanation": "..."}
  ],
  "antutu": number|null,
  "geekbench": number|null,
  "dxocamera": number|null,
  "dxodisplay": number|null,
  "batteryActiveUse": number|null,
  "softwareSupportYears": number|null,
  "currentPrice": {"usd": "$X", "eur": "€X"},
  "launchPrice": {"usd": "$X"}
}
</output_format>

<scoring_weights>
Camera: main(38%) + lowlight(32%) + video(20%) + selfie(10%)
Battery: efficiency(38%) + capacity(32%) + charging(18%) + degradation(12%)
Performance: sustained(44%) + peak(34%) + thermals(18%) + npu(4%)
Display: comfort(34%) + brightness(30%) + color(22%) + refresh(10%) + hdr(4%)
Software: clean(46%) + updates(28%) + features(18%) + bugs(8%)
Design: weight(38%) + materials(34%) + haptics(18%) + durability(10%)
Longevity: policy(58%) + price_perf(32%) + resale(10%)
</scoring_weights>

<extraction_sources>
- GSMArena: antutu, geekbench, batteryActiveUse, currentPrice
- DXOMark: dxocamera, dxodisplay
- Any source: softwareSupportYears, launchPrice
</extraction_sources>

<source_weights>
GSMArena, DXOMark, NotebookCheck: 1.5x weight
General tech blogs: 1.0x weight
</source_weights>

<rules>
- No markdown, no explanations outside JSON
- Missing data → score 5.00, explanation "Not mentioned in any reviews"
- Cite sources for claims: "DXOMark measured 154"
- Flag disagreements >2.0 score difference
</rules>

<reviews>
${reviewsText}
</reviews>`;
}
