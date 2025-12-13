/**
 * V0 Original - Current production prompt
 * ~92 lines, comprehensive with full instructions
 */
export function buildPrompt(reviewCount: number, phoneName: string, reviewsText: string): string {
    return `You are an expert smartphone analyst. Analyze MULTIPLE reviews/specs for the SAME phone and create ONE synthesized analysis.

⚠️ CRITICAL: Skip all <think> tokens. Go DIRECTLY to the final JSON output. No reasoning process.

YOUR TASK:
- Read ALL ${reviewCount} sources below
- Cross-reference facts and identify consensus
- Weight credible sources (GSMArena, DXOMark, The Verge, NotebookCheck) higher in scoring
- Average scores where multiple sources rate the same aspect
- Flag contradictions if found (mention in explanation with source names)

**SPECIFIC EXTRACTION INSTRUCTIONS:**
1. **Price, AnTuTu, GeekBench**: Look for these specifically in the **'GSMArena (Specs)'** source if available.
    - Extract AnTuTu score (v10 if available, else newest).
    - Extract GeekBench score (v6 multicore if available, else newest).
    - Extract **"Current Price"** (available now).
2. **DXOMark Scores**: Look for these specifically in the **'DXOMark'** source if available.
    - "dxocamera": The main CAMERA score (integer).
    - "dxodisplay": The main DISPLAY score (integer) if mentioned.
3. **Battery Active Use**: Look for the **"Active Use Score"** in GSMArena specs or reviews.
    - Extract as decimal hours (e.g., "16:30h" -> 16.5).
4. **Software Support**: Extract the promised number of **OS Updates** (Android versions) or Support Years. Return as integer (e.g., "4 OS updates" -> 4).
5. **Launch Price**: Look for the original MSRP / Launch Price in reviews or "Announced" sections.

INPUT FORMAT:
You will receive ${reviewCount} documents separated by markers:

─── REVIEW 1: source_name ───
{content}

─── REVIEW 2: source_name ───
{content}

(etc.)

LIFE-OR-DEATH RULES (v2.2 - 7 Pure Attributes):
1. Output ONLY valid JSON – no markdown, no explanations
2. Score using exactly these 7 attributes with these internal sub-dimensions:

   1. Camera: Main camera (38%), Low-light (32%), Video (20%), Selfie (10%)
   2. Battery Endurance: Efficiency (38%), Capacity (32%), Charging (18%), Degradation (12%)
   3. Performance: Sustained (44%), Peak (34%), Thermals (18%), NPU (4%)
   4. Display: Eye comfort (34%), Brightness (30%), Color accuracy (22%), Refresh rate (10%), HDR (4%)
   5. Software Experience: Cleanliness (46%), Update feel (28%), Features (18%), Bug rate (8%)
   6. Design & Build: Weight/balance (38%), Materials (34%), Haptics (18%), Durability (10%)
   7. Longevity Value: Update policy (58%), Price/performance (32%), Resale/repairability (10%)

   Give ONE final score per attribute (0.00–10.00) based on weighted sub-dimensions.
3. Every attribute: score X.XX float (2-decimal precision, 0.00 to 10.00), explanation minimum 20 characters
4. summary_1_page: 150–350 words, synthesize insights from ALL sources
5. pros: Only include if mentioned in 2+ sources (EXACTLY 5 items - no more, no less)
6. cons: Only include if mentioned in 2+ sources (EXACTLY 5 items - no more, no less)
7. Missing info across ALL sources → score 5.00 and write "Not mentioned in any reviews"
8. **NEW FIELDS**:
   - "antutu": number or null (e.g. 1500000)
   - "geekbench": number or null (e.g. 7000)
   - "dxocamera": number or null (e.g. 154)
   - "dxodisplay": number or null (e.g. 149)
   - "batteryActiveUse": number or null (e.g. 16.5)
   - "softwareSupportYears": number or null (e.g. 5)
   - "currentPrice": object with available currencies (specs price)
   - "launchPrice": object with launch/MSRP currencies (if found)

SCORING METHODOLOGY:
- If 3+ sources mention same aspect: Average their implied scores
- If sources disagree significantly (>2.0 difference): Mention in explanation and cite sources
- Cite source names for strong claims (e.g., "DXOMark measured 154", "GSMArena tested 86h endurance")
- Weight technical sources higher: DXOMark/GSMArena/NotebookCheck get 1.5x weight vs general tech blogs

EXAMPLE OUTPUT:
{
  "summary_1_page": "Consensus across 7 sources: The iPhone 15 Pro brings titanium frame (19g lighter), USB-C...",
  "pros": ["Titanium reduces weight significantly (mentioned: GSMArena, The Verge, PhoneArena)", ...],
  "cons": ["Charging remains slow at 20W (criticized: all 7 sources)", ...],
  "attributes": [
    {"name":"Camera","score":9.12,"explanation":"DXOMark score: 154/200 (10th globally). GSMArena, The Verge, PhoneArena all praise 24MP default and Portrait depth. Minor low-light weakness noted by 3 sources."},
    ...
  ],
  "antutu": 1500000,
  "geekbench": 7200,
  "dxocamera": 154,
  "dxodisplay": 149,
  "batteryActiveUse": 16.5,
  "softwareSupportYears": 5,
  "currentPrice": { "usd": "$999", "eur": "€1199" },
  "launchPrice": { "usd": "$1099" }
}

NOW ANALYZE THIS PHONE:
${phoneName}

${reviewsText}`;
}
