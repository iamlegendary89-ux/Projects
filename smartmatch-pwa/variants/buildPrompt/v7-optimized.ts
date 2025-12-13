/**
 * V7 OPTIMIZED - Minimum Variance + Realistic Scores
 * 
 * Combines lessons from all variants:
 * - v4-few-shot: Examples for consistency (zero variance on iPhone)
 * - v6-schema-first: Schema upfront for format compliance
 * - v3-chain-of-thought: Conservative scoring (realism)
 * - v2-structured: XML tags for clarity
 * 
 * Key innovations:
 * 1. CALIBRATION ANCHORS - specific score mappings reduce variance
 * 2. DETERMINISTIC LANGUAGE - "must be", "exactly" reduce interpretation
 * 3. SCORE BANDS - defined ranges prevent inflation
 * 4. MANDATORY CITATIONS - forces source-based scoring
 */
export function buildPrompt(reviewCount: number, phoneName: string, reviewsText: string): string {
    return `<task>
Analyze ${reviewCount} reviews for ${phoneName}. Output ONLY the JSON below.
</task>

<schema>
{
  "summary_1_page": "150-350 words synthesizing ALL sources",
  "pros": ["exactly 5 items, each citing 2+ sources"],
  "cons": ["exactly 5 items, each citing 2+ sources"],
  "attributes": [
    {"name": "Camera", "score": float, "explanation": "min 30 chars with source citations"},
    {"name": "Battery Endurance", "score": float, "explanation": "..."},
    {"name": "Performance", "score": float, "explanation": "..."},
    {"name": "Display", "score": float, "explanation": "..."},
    {"name": "Software Experience", "score": float, "explanation": "..."},
    {"name": "Design & Build", "score": float, "explanation": "..."},
    {"name": "Longevity Value", "score": float, "explanation": "..."}
  ],
  "antutu": int|null,
  "geekbench": int|null,
  "dxocamera": int|null,
  "dxodisplay": int|null,
  "batteryActiveUse": float|null,
  "softwareSupportYears": int|null,
  "currentPrice": {"usd"?: "$X", "eur"?: "€X"},
  "launchPrice": {"usd"?: "$X"}
}
</schema>

<calibration_anchors>
CRITICAL: Use these EXACT score mappings to ensure consistency:

CAMERA (based on DXOMark + source consensus):
- DXOMark 155+, universal praise → 9.4-9.6
- DXOMark 145-154, mostly positive → 8.8-9.3
- DXOMark 130-144, mixed reviews → 8.0-8.7
- No DXOMark, positive mentions → 7.5-8.5
- Criticized by 3+ sources → subtract 0.3-0.5

BATTERY (based on GSMArena Active Use hours):
- 16+ hours, fast charging → 9.0-9.5
- 14-16 hours, decent charging → 8.0-8.9
- 12-14 hours → 7.0-7.9
- <12 hours OR slow charging criticized → 6.5-7.5

PERFORMANCE (based on Geekbench Multi-Core):
- 10000+, no throttling → 9.5-9.8
- 7000-9999, minor throttling → 9.0-9.4
- 5000-6999 → 8.0-8.9
- Thermal issues noted → subtract 0.3

DISPLAY (based on DXOMark Display + source mentions):
- DXOMark 150+, brightness 2000+ nits → 9.2-9.5
- DXOMark 140-149, good brightness → 8.5-9.1
- PWM concerns noted → subtract 0.2-0.3

SOFTWARE:
- 7 years updates + clean UI → 9.3-9.6
- 5-6 years updates → 8.5-9.2
- 4 years updates → 7.5-8.4
- Bugs/bloatware noted → subtract 0.3-0.5

DESIGN & BUILD:
- Premium materials (titanium/ceramic), under 185g → 9.0-9.5
- Glass/aluminum, good weight → 8.0-8.9
- Durability concerns → subtract 0.3

LONGEVITY VALUE:
- 7 years support, reasonable price → 8.8-9.3
- 5-6 years support → 8.0-8.7
- High price noted by 3+ sources → subtract 0.3-0.5
</calibration_anchors>

<extraction_rules>
MANDATORY EXTRACTIONS (null if not found):
- antutu: From GSMArena specs (v10 preferred)
- geekbench: Multi-core score from specs/benchmarks
- dxocamera: Integer from DXOMark source
- dxodisplay: Integer from DXOMark source
- batteryActiveUse: Hours as decimal (16:30h → 16.5)
- softwareSupportYears: Integer (OS updates promised)
- currentPrice: Current retail price with currency
- launchPrice: Original MSRP at announcement
</extraction_rules>

<scoring_weights>
Each attribute uses these internal sub-weights:
- Camera: main(38%) + lowlight(32%) + video(20%) + selfie(10%)
- Battery: efficiency(38%) + capacity(32%) + charging(18%) + degradation(12%)
- Performance: sustained(44%) + peak(34%) + thermals(18%) + npu(4%)
- Display: comfort(34%) + brightness(30%) + color(22%) + refresh(10%) + hdr(4%)
- Software: cleanliness(46%) + updates(28%) + features(18%) + bugs(8%)
- Design: weight(38%) + materials(34%) + haptics(18%) + durability(10%)
- Longevity: policy(58%) + price_perf(32%) + resale(10%)
</scoring_weights>

<source_weights>
GSMArena, DXOMark, NotebookCheck = 1.5x weight (lab testing)
PhoneArena, TechRadar, Tom's Guide = 1.2x weight
Android Central, Android Authority = 1.0x weight
</source_weights>

<example>
Phone: Samsung Galaxy S24 Ultra (reference calibration)
{
  "summary_1_page": "The Galaxy S24 Ultra combines a titanium frame with a 200MP camera and 7-year update promise...",
  "pros": ["Titanium frame reduces weight (GSMArena, TechRadar)", "200MP camera excels in daylight (DXOMark 144)", "Snapdragon 8 Gen 3 performance (NotebookCheck, PhoneArena)", "7-year software commitment (all sources)", "S Pen included (AndroidCentral, TechRadar)"],
  "cons": ["45W charging still slow vs competition (all sources)", "Camera system unchanged from S23 Ultra (PhoneArena, NotebookCheck)", "High $1299 starting price (AndroidCentral, Tom's Guide)", "Shutter lag in camera app (DXOMark, GSMArena)", "Heavy at 232g (TomsGuide, AndroidCentral)"],
  "attributes": [
    {"name": "Camera", "score": 9.15, "explanation": "DXOMark 144. 200MP main praised daylight/portraits. Low-light and shutter lag criticized by 4 sources."},
    {"name": "Battery Endurance", "score": 8.2, "explanation": "GSMArena 16:30h active use. 45W charging takes 65min. Good efficiency but slow charging."},
    {"name": "Performance", "score": 9.35, "explanation": "Geekbench 7200 multi-core. Sustained throttling to 78% noted by NotebookCheck."},
    {"name": "Display", "score": 9.25, "explanation": "DXOMark 150. 2600 nits peak, excellent color. PWM-free praised."},
    {"name": "Software Experience", "score": 9.1, "explanation": "One UI 6.1 clean with Galaxy AI. 7 years updates. Some bloatware noted."},
    {"name": "Design & Build", "score": 8.7, "explanation": "Titanium frame premium. 232g heavy per 5 sources. IP68, Gorilla Armor."},
    {"name": "Longevity Value", "score": 8.5, "explanation": "7-year support excellent. $1299 price hurts value. Strong resale historically."}
  ],
  "antutu": 2050000,
  "geekbench": 7200,
  "dxocamera": 144,
  "dxodisplay": 150,
  "batteryActiveUse": 16.5,
  "softwareSupportYears": 7,
  "currentPrice": {"usd": "$1199", "eur": "€1449"},
  "launchPrice": {"usd": "$1299"}
}
</example>

<rules>
1. Output ONLY valid JSON - no markdown, no explanation text
2. Scores MUST use calibration anchors above - no arbitrary scoring
3. Every explanation MUST cite specific sources by name
4. Exactly 5 pros, exactly 5 cons - each citing 2+ sources
5. If data missing in ALL sources → score 5.00, note "Not mentioned in any reviews"
6. When sources disagree >1.0 points: note highest, lowest, and consensus
7. Round scores to 2 decimal places (e.g., 8.75, not 8.7 or 8.753)
</rules>

<reviews>
${reviewsText}
</reviews>`;
}
