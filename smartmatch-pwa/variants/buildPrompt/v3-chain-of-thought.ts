/**
 * V3 Chain-of-Thought - Explicit reasoning steps
 * Strategy: Guide LLM through step-by-step analysis
 * Goal: More thorough analysis, better accuracy
 */
export function buildPrompt(reviewCount: number, phoneName: string, reviewsText: string): string {
    return `You are analyzing ${reviewCount} reviews for: ${phoneName}

STEP 1: EXTRACT RAW DATA
First, find these values from specific sources:
- From GSMArena Specs: antutu score, geekbench score, battery active use hours, current price
- From DXOMark: camera score (integer), display score (integer)
- From any source: software support years, launch price

STEP 2: ANALYZE EACH ATTRIBUTE
For each of the 7 attributes, consider ALL ${reviewCount} sources:

A) CAMERA (weight: main 38%, lowlight 32%, video 20%, selfie 10%)
   - What do sources say about each sub-dimension?
   - Calculate weighted score 0.00-10.00

B) BATTERY ENDURANCE (weight: efficiency 38%, capacity 32%, charging 18%, degradation 12%)
   - Screen-on time, charging speed, battery health mentions
   - Calculate weighted score

C) PERFORMANCE (weight: sustained 44%, peak 34%, thermals 18%, npu 4%)
   - Gaming tests, benchmark scores, thermal throttling
   - Calculate weighted score

D) DISPLAY (weight: comfort 34%, brightness 30%, color 22%, refresh 10%, hdr 4%)
   - Peak brightness, PWM, color accuracy, smoothness
   - Calculate weighted score

E) SOFTWARE EXPERIENCE (weight: clean 46%, updates 28%, features 18%, bugs 8%)
   - Bloatware, update policy, UI fluidity, reported bugs
   - Calculate weighted score

F) DESIGN & BUILD (weight: balance 38%, materials 34%, haptics 18%, durability 10%)
   - Weight distribution, premium feel, motor quality, durability
   - Calculate weighted score

G) LONGEVITY VALUE (weight: policy 58%, price/perf 32%, resale 10%)
   - Update years, value proposition, expected resale
   - Calculate weighted score

STEP 3: SYNTHESIZE
- Identify 5 pros mentioned by 2+ sources (cite them)
- Identify 5 cons mentioned by 2+ sources (cite them)
- Write 150-350 word summary of consensus

STEP 4: OUTPUT JSON ONLY
{
  "summary_1_page": "...",
  "pros": ["Pro 1 (GSMArena, The Verge)", "Pro 2 (DXOMark, PhoneArena)", ...],
  "cons": ["Con 1 (all sources)", "Con 2 (3 sources)", ...],
  "attributes": [
    {"name": "Camera", "score": X.XX, "explanation": "..."},
    {"name": "Battery Endurance", "score": X.XX, "explanation": "..."},
    {"name": "Performance", "score": X.XX, "explanation": "..."},
    {"name": "Display", "score": X.XX, "explanation": "..."},
    {"name": "Software Experience", "score": X.XX, "explanation": "..."},
    {"name": "Design & Build", "score": X.XX, "explanation": "..."},
    {"name": "Longevity Value", "score": X.XX, "explanation": "..."}
  ],
  "antutu": number|null,
  "geekbench": number|null,
  "dxocamera": number|null,
  "dxodisplay": number|null,
  "batteryActiveUse": number|null,
  "softwareSupportYears": number|null,
  "currentPrice": {"usd": "...", "eur": "..."},
  "launchPrice": {"usd": "..."}
}

IMPORTANT:
- Output JSON only, no markdown
- Missing data = score 5.00, note "Not mentioned"
- GSMArena/DXOMark/NotebookCheck get 1.5x weight

REVIEWS:
${reviewsText}`;
}
