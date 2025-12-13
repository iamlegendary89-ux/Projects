#!/usr/bin/env node
/**
 * SmartMatch Enrichment Engine v7 - Final Optimized
 * Best of both: v6 performance + v5 maintainability + Hybrid organization
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFile, mkdir, writeFile, readdir, appendFile, stat } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

// Telemetry imports removed as they are not used (using local logger)

// LZFOF v2: Pre-compiled regex, single pass
const ID_SANITIZE_RE = /[^a-z0-9]/g;
function generateId(brand: string, model: string): string {
  return `${brand.toLowerCase()}_${model.toLowerCase().replace(ID_SANITIZE_RE, "_")}`;
}

// ============================================================================
// TYPES (Exported for library consumers)
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface AttributeScore { score: number; explanation: string; }

export interface EnrichmentMetadata {
  confidence: number;
  modelUsed: string;
  processingVersion: string;
  processedAt: string;
  processingTimeMs: number;
  sourceCount: number;
  sourceNames: string[];
  sourceUrls: string[];
  batchMode: true;
  truthCorrectionApplied?: boolean;
  splitMode?: boolean;
  tokenUsage?: { total: number; prompt?: number; completion?: number };
  llmConfidence?: number; // Self-reported confidence from the model
}

export interface EnrichmentResult {
  brand: string;
  model: string;
  overallScore: number;
  category: "flagship" | "premium" | "upper_midrange" | "midrange" | "budget";
  onePageSummary: string;
  pros: string[];
  cons: string[];
  originalAttributes: Record<string, AttributeScore>;  // Raw AI scores before OSET correction
  antutu?: number | null;
  geekbench?: number | null;
  dxocamera?: number | null;
  dxodisplay?: number | null;
  batteryActiveUse?: number | null; // Hours
  currentPrice?: {
    usd?: string | undefined;
    eur?: string | undefined;
    inr?: string | undefined;
    gbp?: string | undefined;
  };
  launchPrice?: {
    usd?: string | undefined;
    eur?: string | undefined;
    inr?: string | undefined;
    gbp?: string | undefined;
  };
  metadata: EnrichmentMetadata;
}

export interface PhoneEntry { phoneId: string; brand: string; model: string; }

// EnrichmentClient interface for DI/testing
export interface EnrichmentClient {
  call(model: string, prompt: string): Promise<{ content: string; tokens: number; usage: { total: number; prompt?: number; completion?: number } | undefined }>;
}

export interface EnrichmentOptions {
  apiKey?: string;
  modelName?: string;
  client?: EnrichmentClient; // DI support
}

// ============================================================================
// IMMUTABLE CONSTANTS (Object.freeze for safety)
// ============================================================================

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
const LOG_LEVEL_INDEX = LOG_LEVELS.indexOf((process.env["LOG_LEVEL"] as LogLevel) || "info");
const LOG_DIR = "logs";

const THRESHOLDS = Object.freeze({
  FLAGSHIP: 7.5,      // Was 8.5 - too high after truth correction
  PREMIUM: 6.5,       // Was 7.6
  UPPER_MID: 5.5,     // Was 6.7
  MIDRANGE: 4.5,      // Was 5.6
});

const DEFAULT_WEIGHTS = Object.freeze({
  Camera: 0.20,
  Performance: 0.18,
  Display: 0.16,
  "Battery Endurance": 0.16,
  "Software Experience": 0.12,
  "Design & Build": 0.10,
  "Longevity Value": 0.08,
});

const BRAND_WEIGHTS = Object.freeze({
  apple: { "Software Experience": 0.18, Camera: 0.18, Performance: 0.16, "Longevity Value": 0.06 },
  samsung: { Display: 0.20, Camera: 0.20, "Software Experience": 0.14, "Battery Endurance": 0.14, Performance: 0.16, "Design & Build": 0.08 },
  google: { "Software Experience": 0.20, Camera: 0.20, "Battery Endurance": 0.14, Performance: 0.16, Display: 0.14, "Design & Build": 0.08 },
  xiaomi: { "Battery Endurance": 0.20, "Longevity Value": 0.12, Performance: 0.16, Camera: 0.18, Display: 0.14, "Software Experience": 0.10 },
  oneplus: { Performance: 0.22, "Battery Endurance": 0.18, "Longevity Value": 0.10, Camera: 0.18, Display: 0.14, "Software Experience": 0.10, "Design & Build": 0.08 },
  oppo: { Camera: 0.22, "Design & Build": 0.14, Performance: 0.16, "Battery Endurance": 0.14, Display: 0.14 },
  vivo: { Camera: 0.22, Display: 0.18, "Design & Build": 0.12, Performance: 0.16, "Battery Endurance": 0.14, "Software Experience": 0.10 },
  motorola: { "Longevity Value": 0.14, "Battery Endurance": 0.18, "Software Experience": 0.10, Camera: 0.18, Performance: 0.16, Display: 0.14 },
  asus: { Performance: 0.24, "Battery Endurance": 0.18, Display: 0.16, Camera: 0.16, "Software Experience": 0.10, "Design & Build": 0.08 },
  nothing: { "Design & Build": 0.18, "Software Experience": 0.16, "Longevity Value": 0.10, Camera: 0.16, Performance: 0.14, Display: 0.12, "Battery Endurance": 0.14 },
  realme: { "Longevity Value": 0.16, "Battery Endurance": 0.18, Performance: 0.16, Camera: 0.16, Display: 0.14, "Design & Build": 0.08 },
});

const ATTR_ALIASES = Object.freeze({
  "battery life": "Battery Endurance",
  "battery endurance": "Battery Endurance",
  charging: "Battery Endurance",
  "design & build": "Design & Build",
  "build & design": "Design & Build",
  "software experience": "Software Experience",
  ui: "Software Experience",
  ux: "Software Experience",
  "user experience": "Software Experience",
  "longevity value": "Longevity Value",
  price: "Longevity Value",
});

const SOURCE_NAMES = Object.freeze({
  gsmarena: "GSMArena",
  phonearena: "PhoneArena",
  dxomark: "DXOMark",
  tomsguide: "Tom's Guide",
  techradar: "TechRadar",
  theverge: "The Verge",
  notebookcheck: "NotebookCheck",
  androidcentral: "Android Central",
  androidauthority: "Android Authority",
});

// Pre-compiled regexes
const RE_META_SOURCE = /Source: (.+)/m;
const RE_META_URL = /URL: (.+)/m;
const RE_REVIEW_FILE = /^\d+_.*_(review|specs)\.txt$/;
const RE_JSON_WRAP = /^```json\n|\n```$/g;

// ============================================================================
// FUNCTIONAL LOGGER (v6 performance, no class overhead)
// ============================================================================

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
const logFile = `${LOG_DIR}/enrichment_v7_${timestamp}.log`;
const startTime = Date.now();

mkdir(LOG_DIR, { recursive: true }).catch(() => { /* ignore */ });

// Pending log writes for flush
const pendingLogWrites: Promise<void>[] = [];

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LOG_LEVELS.indexOf(level) < LOG_LEVEL_INDEX) { return; }

  const now = new Date();
  const entry = { level, message, timestamp: now.toISOString(), elapsed: Date.now() - startTime, ...(meta && { meta }) };
  const emoji = level === "error" ? "❌" : level === "warn" ? "⚠️" : level === "info" ? "ℹ️" : "🔍";
  const color = level === "error" ? "\x1b[31m" : level === "warn" ? "\x1b[33m" : "\x1b[36m";

  console.log(`${emoji} ${color}[${now.toLocaleTimeString("en-US", { hour12: false })}]\x1b[0m ${message}`);
  const writePromise = appendFile(logFile, JSON.stringify(entry) + "\n", "utf8").catch(() => { /* ignore */ });
  pendingLogWrites.push(writePromise);
}

const logger = {
  debug: (m: string, d?: Record<string, unknown>) => log("debug", m, d),
  info: (m: string, d?: Record<string, unknown>) => log("info", m, d),
  warn: (m: string, d?: Record<string, unknown>) => log("warn", m, d),
  error: (m: string, d?: Record<string, unknown>) => log("error", m, d),
  flush: async () => { await Promise.all(pendingLogWrites); pendingLogWrites.length = 0; },
};

// ============================================================================
// VALIDATION SCHEMA (Strict - same as v6)
// ============================================================================

const EnrichmentSchema = z.object({
  summary_1_page: z.string().min(150).max(2800),
  pros: z.array(z.string()).length(5),
  cons: z.array(z.string()).length(5),
  attributes: z.array(z.object({
    name: z.string(),
    score: z.number().min(0).max(10),
    explanation: z.string().min(20),
  })).length(7),
  // NEW: Benchmark and Price fields
  antutu: z.number().nullable().optional(),
  geekbench: z.number().nullable().optional(),
  dxocamera: z.number().nullable().optional(),
  dxodisplay: z.number().nullable().optional(),
  batteryActiveUse: z.number().nullable().optional(), // New: GSMArena Active Use Score in hours
  softwareSupportYears: z.number().nullable().optional(), // New: Extracted years of support
  currentPrice: z.object({
    usd: z.string().optional(),
    eur: z.string().optional(),
    inr: z.string().optional(),
    gbp: z.string().optional(),
  }).optional(),
  launchPrice: z.object({
    usd: z.string().optional(),
    eur: z.string().optional(),
    inr: z.string().optional(),
    gbp: z.string().optional(),
  }).optional(),
  // NEW: LLM Self-Confidence
  llmConfidence: z.number().min(0).max(1).optional(),
}).strict();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function normalizePath(brand: string, model: string = ""): string {
  return `${brand}_${model}`.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

// LZFOF v2: Pre-compiled regex, faster path extraction
const PATH_SEP_RE = /[\\/]/;
const FILE_SUFFIX_RE = /^\d+_|_(?:review|specs)\.txt$/g;
export function formatSourceName(filePath: string): string {
  const parts = filePath.split(PATH_SEP_RE);
  const file = parts[parts.length - 1] || filePath;
  const isSpecs = file.includes("_specs");
  const name = file.replace(FILE_SUFFIX_RE, "");
  const baseName = SOURCE_NAMES[name.toLowerCase() as keyof typeof SOURCE_NAMES]
    || name.split("_").filter(Boolean).map(w => w[0]!.toUpperCase() + w.slice(1)).join(" ");
  return isSpecs ? `${baseName} (Specs)` : baseName;
}

export function getAttributeWeights(brand: string): Record<string, number> {
  const override = BRAND_WEIGHTS[brand.toLowerCase() as keyof typeof BRAND_WEIGHTS];
  return override ? { ...DEFAULT_WEIGHTS, ...override } : { ...DEFAULT_WEIGHTS };
}

// LZFOF: Benchmark showed if-else chain is 111% faster than loop
function categorize(score: number): EnrichmentResult["category"] {
  if (score >= THRESHOLDS.FLAGSHIP) { return "flagship"; }
  if (score >= THRESHOLDS.PREMIUM) { return "premium"; }
  if (score >= THRESHOLDS.UPPER_MID) { return "upper_midrange"; }
  if (score >= THRESHOLDS.MIDRANGE) { return "midrange"; }
  return "budget";
}

// LZFOF v2: Reduced allocations, manual loop, multiplier accumulation
const NOT_MENTIONED_RE = /not mentioned/i;
function calcConfidence(attrs: Array<{ score: number; explanation: string }>, ms: number, tokens: number, sources: number): number {
  // Count complete attributes without creating intermediate array
  let complete = 0;
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i]!;
    if (a.score > 0 && !NOT_MENTIONED_RE.test(a.explanation)) { complete++; }
  }

  // New Logarithmic Model (v7.1):
  // 1 source -> 0.60
  // 4 sources -> 0.84
  // 8 sources -> 0.96
  // 10+ sources -> ~0.99
  const sourceBonus = 0.12 * Math.log2(Math.max(1, sources));
  const base = 0.60 + sourceBonus;

  // Attribute completion acts as a multiplier (0.0 to 1.0)
  let c = base * (complete / 7);

  // Timing penalties (Relaxed for thinking models)
  if (ms < 1000) { c *= 0.90; }          // Suspiciously fast
  else if (ms > 90000) { c *= 0.98; }    // Very slow (>90s)

  // Token penalties
  if (tokens > 8000) { c *= 0.98; }      // Very verbose
  else if (tokens < 1000) { c *= 0.80; } // Too short to be reliable

  return Math.max(0.1, Math.min(0.999, c));
}

// ============================================================================
// PHONES.JSON CACHE (avoids repeated file reads)
// ============================================================================

type UrlEntry = { cse?: string; archive?: string; source?: string };
type PhonesConfig = { brands: Record<string, Record<string, { releaseDate?: string; urls?: Record<string, UrlEntry[]> }>> };
let phonesCache: PhonesConfig | null = null;

async function getPhones(): Promise<PhonesConfig> {
  if (!phonesCache) {
    try {
      phonesCache = JSON.parse(await readFile("data/phones.json", "utf-8")) as PhonesConfig;
    } catch {
      phonesCache = { brands: {} };
    }
  }
  return phonesCache;
}






// Load source URLs from phones.json by matching review filename to url keys
async function loadSourceUrls(brand: string, model: string, files: string[]): Promise<Map<string, string>> {
  const phones = await getPhones();
  const phoneConfig = phones.brands[brand.toLowerCase()]?.[model.toLowerCase()];
  const urlMap = new Map<string, string>();

  if (!phoneConfig?.urls) { return urlMap; }

  for (const file of files) {
    // Extract source key from filename: "2_gsmarena_review.txt" -> "gsmarena_review"
    // Also handles "1_gsmarena_specs.txt" -> "gsmarena_specs"
    const basename = file.split(/[/\\]/).pop() || "";
    const match = basename.match(/^\d+_(.+?)\.txt$/);
    if (!match) { continue; }

    const sourceKey = match[1]; // e.g., "gsmarena_review" or "gsmarena_specs"
    const urlEntry = sourceKey ? phoneConfig.urls?.[sourceKey]?.[0] : undefined;

    if (urlEntry?.cse) {
      urlMap.set(file, urlEntry.cse);
    }
  }

  return urlMap;
}

// ============================================================================
// API CLIENT (with timeout support)
// ============================================================================

const API_TIMEOUT_MS = 60000; // 60 second timeout

async function callOpenRouterAPI(
  apiKey: string,
  model: string,
  content: string,
): Promise<{ content: string; tokens: number; usage: { total: number; prompt?: number; completion?: number } | undefined }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const heartbeat = setInterval(() => {
      const elapsed = Math.round((Date.now() - start) / 1000);
      if (elapsed % 10 === 0) {
        logger.info(`... still thinking (${elapsed}s elapsed) ...`);
      }
    }, 10000);

    const start = Date.now();
    let res;
    try {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://smartmatch.ai",
          "X-Title": "SmartMatch Enrichment Engine",
          "X-OpenRouter-App-Name": "SmartMatch-v7-Final",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content }],
          temperature: 0.2,
          max_tokens: 4000,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } finally {
      clearInterval(heartbeat);
    }

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      const line = text.split("\n")[0];
      if (res.status === 429) {
        const retry = res.headers.get("retry-after");
        throw new Error(`Rate limited: ${line}${retry ? ` (retry after ${retry}s)` : ""}`);
      }
      throw new Error(`API error (${res.status}): ${line}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number; prompt_tokens?: number; completion_tokens?: number };
    };
    const tokens = data.usage?.total_tokens || 0;
    if (tokens) { logger.debug("API call", { tokens, cost: `$${(tokens * 0.00001).toFixed(4)}` }); }

    return {
      content: data.choices[0]?.message?.content?.trim() || "",
      tokens,
      usage: data.usage ? {
        total: data.usage.total_tokens,
        ...(data.usage.prompt_tokens !== undefined && { prompt: data.usage.prompt_tokens }),
        ...(data.usage.completion_tokens !== undefined && { completion: data.usage.completion_tokens }),
      } : undefined,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`API request timeout after ${API_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

// ============================================================================
// REVIEW PARSING (Parallel for performance)
// ============================================================================

async function parseReviewFile(path: string): Promise<{ source: string; url: string | undefined; content: string }> {
  let content = await readFile(path, "utf8");
  let source: string | undefined;
  let url: string | undefined;

  if (content.startsWith("=== REVIEW METADATA ===")) {
    const end = content.indexOf("=========================\n\n");
    if (end !== -1) {
      const header = content.substring(0, end);
      content = content.substring(end + "=========================\n\n".length);
      source = RE_META_SOURCE.exec(header)?.[1]?.trim();
      url = RE_META_URL.exec(header)?.[1]?.trim();
    }
  }

  if (!source) { source = formatSourceName(path); }
  return { source, url, content };
}

async function parseReviewFiles(files: string[]): Promise<{
  reviews: string[];
  meta: Array<{ source: string; url: string | undefined }>;
}> {
  // Parallel file reading for performance
  const results = await Promise.all(files.map(parseReviewFile));

  const reviews: string[] = [];
  const meta: Array<{ source: string; url: string | undefined }> = [];

  for (const [i, r] of results.entries()) {
    meta.push({ source: r.source, url: r.url });
    reviews.push(`─── REVIEW ${i + 1}: ${r.source} ───\n${r.content}\n`);
  }

  return { reviews, meta };
}

// ============================================================================
// PROMPT BUILDER (Mirrored from v6)
// ============================================================================

function buildPrompt(reviewCount: number, phoneName: string, reviewsText: string): string {
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
   - "llmConfidence": number (0.00-1.00) - Your own confidence based on source consistency/conflicts.

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
  "launchPrice": { "usd": "$1099" },
  "llmConfidence": 0.95
}

NOW ANALYZE THIS PHONE:
${phoneName}

${reviewsText}`;
}

// ============================================================================
// CORE ENRICHMENT FUNCTION (Internal with depth tracking)
// ============================================================================

async function enrichPhoneInternal(
  brand: string,
  model: string,
  files: string[],
  options?: EnrichmentOptions,
  depth = 0,
): Promise<EnrichmentResult> {
  // Validate
  if (!brand?.trim() || brand.length > 50) { throw new Error("Invalid brand"); }
  if (!model?.trim() || model.length > 100) { throw new Error("Invalid model"); }
  if (!Array.isArray(files) || files.length === 0 || files.length > 20) { throw new Error("Invalid files"); }

  // Support DI client or create from API key
  const apiKey = options?.apiKey || process.env["OPENROUTER_API_KEY"];
  if (!apiKey && !options?.client) { throw new Error("OPENROUTER_API_KEY missing"); }
  const modelName = options?.modelName || process.env["ENRICHMENT_MODEL"] || "tngtech/deepseek-r1t2-chimera:free";

  const start = Date.now();
  const phone = `${brand} ${model}`;

  logger.info("Starting enrichment", { phone, reviewCount: files.length, depth });

  // Parse reviews and load source URLs from phones.json
  const { reviews, meta } = await parseReviewFiles(files);
  const urlMap = await loadSourceUrls(brand, model, files);

  // Merge URLs into meta (phones.json takes priority)
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const metaEntry = meta[i];
    if (file && metaEntry && !metaEntry.url) {
      const fileUrl = urlMap.get(file);
      if (fileUrl) { metaEntry.url = fileUrl; }
    }
  }

  const reviewsText = reviews.join("\n");
  const prompt = buildPrompt(files.length, phone, reviewsText);

  // Check token limit
  const estimatedTokens = Math.ceil(prompt.length / 3.2);
  if (estimatedTokens > 100000) {
    logger.warn("Token limit exceeded, splitting batch", { tokens: estimatedTokens });
    return enrichSplit(brand, model, files, options, depth);
  }

  // API call with retry
  let result: { content: string; tokens: number } | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      logger.info("Sending prompt to LLM", { brand, model, promptLength: prompt.length });
      result = await callOpenRouterAPI(apiKey!, modelName, prompt);
      logger.info("Received response from LLM", { brand, model, responseLength: result.content.length });
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Rate limited") && attempt < 3) {
        const delay = 1000 * Math.pow(2, attempt - 1) + Math.random() * 500;
        logger.warn("Rate limited, retrying", { attempt, delay: Math.round(delay) });
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  if (!result) { throw new Error("API call failed after 3 attempts"); }

  // Parse response (strict - no fallback, same as v6)
  const raw = result.content.replace(RE_JSON_WRAP, "").trim();
  let parsed;
  try {
    parsed = EnrichmentSchema.parse(JSON.parse(raw));
  } catch (err) {
    logger.error("JSON parsing failed", { error: String(err), rawSample: raw.substring(0, 500) });
    throw new Error(`JSON parsing failed: ${String(err)}`);
  }

  // Build attributes with proper score rounding
  const attributes = Object.fromEntries(
    parsed.attributes.map(a => [a.name, {
      score: Math.round(a.score * 100) / 100,
      explanation: a.explanation,
    }]),
  );

  // Save raw AI attributes
  const originalAttributes = JSON.parse(JSON.stringify(attributes)) as Record<string, AttributeScore>;

  // Calculate overall score from raw attributes
  const weights = getAttributeWeights(brand);
  let overallScore = 0;
  for (const [name, data] of Object.entries(originalAttributes)) {
    const canon = ATTR_ALIASES[name.toLowerCase() as keyof typeof ATTR_ALIASES] || name;
    overallScore += data.score * (weights[canon] ?? 0.05);
  }
  overallScore = Math.round(overallScore * 100) / 100;

  logger.info("Enrichment complete", {
    brand,
    model,
    overallScore,
    attributesCount: Object.keys(originalAttributes).length,
  });

  const elapsed = Date.now() - start;
  const confidence = calcConfidence(parsed.attributes, elapsed, result.tokens, files.length);

  logger.info("Enrichment complete", { phone, score: overallScore, category: categorize(overallScore), confidence, ms: elapsed });

  return {
    brand,
    model,
    overallScore,
    category: categorize(overallScore),
    onePageSummary: parsed.summary_1_page,
    pros: parsed.pros,
    cons: parsed.cons,
    originalAttributes,
    // NEW: Pass through fields - use spread to handle undefined STRICTLY
    ...(parsed.antutu !== undefined ? { antutu: parsed.antutu } : {}),
    ...(parsed.geekbench !== undefined ? { geekbench: parsed.geekbench } : {}),
    ...(parsed.dxocamera !== undefined ? { dxocamera: parsed.dxocamera } : {}),
    ...(parsed.dxodisplay !== undefined ? { dxodisplay: parsed.dxodisplay } : {}),
    ...(parsed.batteryActiveUse !== undefined ? { batteryActiveUse: parsed.batteryActiveUse } : {}),
    ...(parsed.softwareSupportYears !== undefined ? { softwareSupportYears: parsed.softwareSupportYears } : {}),
    ...(parsed.currentPrice ? { currentPrice: parsed.currentPrice } : {}),
    ...(parsed.launchPrice ? { launchPrice: parsed.launchPrice } : {}),
    metadata: {
      confidence,
      modelUsed: modelName,
      processingVersion: "v7-Final",
      processedAt: new Date().toISOString(),
      processingTimeMs: elapsed,
      sourceCount: files.length,
      sourceNames: meta.map(m => m.source || "Unknown"),
      sourceUrls: meta.map(m => m.url).filter((u): u is string => !!u && u !== "N/A"),
      batchMode: true,
      ...(parsed.llmConfidence !== undefined ? { llmConfidence: parsed.llmConfidence } : {}),
    },
  };
}

// Public wrapper (exported for library use)
export async function enrichPhone(
  brand: string,
  model: string,
  files: string[],
  options?: EnrichmentOptions,
): Promise<EnrichmentResult> {
  return enrichPhoneInternal(brand, model, files, options, 0);
}

// ============================================================================
// EXPORTED API CLIENT CLASS (for DI/testing)
// ============================================================================

export class OpenRouterClient implements EnrichmentClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async call(model: string, prompt: string): Promise<{ content: string; tokens: number; usage: { total: number; prompt?: number; completion?: number } | undefined }> {
    return callOpenRouterAPI(this.apiKey, model, prompt);
  }
}

// ============================================================================
// SPLIT BATCH PROCESSING (with depth tracking)
// ============================================================================

const MAX_SPLIT_DEPTH = 3;

async function enrichSplit(brand: string, model: string, files: string[], options?: EnrichmentOptions, depth = 0): Promise<EnrichmentResult> {
  if (depth >= MAX_SPLIT_DEPTH) {
    throw new Error(`Max split depth (${MAX_SPLIT_DEPTH}) exceeded - input too large`);
  }

  const mid = Math.ceil(files.length / 2);
  logger.info("Splitting batch", { batch1: mid, batch2: files.length - mid, depth: depth + 1 });

  const [r1, r2] = await Promise.all([
    enrichPhoneInternal(brand, model, files.slice(0, mid), options, depth + 1),
    enrichPhoneInternal(brand, model, files.slice(mid), options, depth + 1),
  ]);

  const mergedAttrs = Object.fromEntries(
    Object.keys(r1.originalAttributes).map(k => [k, {
      score: Math.round(((r1.originalAttributes[k]!.score + r2.originalAttributes[k]!.score) / 2) * 100) / 100,
      explanation: `Batch 1: ${r1.originalAttributes[k]!.explanation}\n\nBatch 2: ${r2.originalAttributes[k]!.explanation}`,
    }]),
  );

  const mergedScore = Math.round(((r1.overallScore + r2.overallScore) / 2) * 100) / 100;

  return {
    ...r1,
    overallScore: mergedScore,
    category: categorize(mergedScore),
    onePageSummary: `${r1.onePageSummary}\n\n[Batch 2]: ${r2.onePageSummary}`,
    pros: [...new Set([...r1.pros, ...r2.pros])].slice(0, 5),
    cons: [...new Set([...r1.cons, ...r2.cons])].slice(0, 5),
    originalAttributes: mergedAttrs,
    metadata: {
      ...r1.metadata,
      confidence: Math.round(((r1.metadata.confidence + r2.metadata.confidence) / 2) * 1000) / 1000,
      sourceCount: r1.metadata.sourceCount + r2.metadata.sourceCount,
      splitMode: true,
    },
  };
}

// ============================================================================
// DISCOVERY FUNCTIONS
// ============================================================================

export async function findReviewFiles(brand: string, model: string): Promise<string[]> {
  const dir = `data/content/${normalizePath(brand, model)}`;
  try {
    const files = await readdir(dir);
    return files.filter(f => f.endsWith(".txt") && RE_REVIEW_FILE.test(f)).map(f => `${dir}/${f}`).sort();
  } catch {
    return [];
  }
}

// ============================================================================
// BATCH CONFIGURATION
// ============================================================================

const BATCH_LIMIT = 4; // Max phones to enrich per run

// ============================================================================
// PRIORITY QUEUE LOGIC
// ============================================================================

interface PhonePriority extends PhoneEntry {
  currentSources: number;
  previousSources: number;
  releaseDate: string | undefined;
  reason: "new" | "new_sources" | "missing_content";
}

async function loadRegistry(): Promise<Record<string, { processingStats?: { totalUrlsProcessed?: number }, filename?: string }>> {
  try {
    const data = JSON.parse(await readFile("data/processed-phones.json", "utf8")) as { phones?: Record<string, unknown> };
    return (data.phones || {}) as Record<string, { processingStats?: { totalUrlsProcessed?: number }, filename?: string }>;
  } catch {
    return {};
  }
}

export async function getPhonesNeedingEnrichment(): Promise<PhoneEntry[]> {
  const cfg = await getPhones();
  const registry = await loadRegistry();

  const queue: PhonePriority[] = [];
  const brands = cfg.brands || {};

  for (const brand of Object.keys(brands)) {
    for (const model of Object.keys(brands[brand] || {})) {
      const phoneId = generateId(brand, model);
      if (!phoneId) { continue; }

      const files = await findReviewFiles(brand, model);
      if (files.length === 0) { continue; }

      const currentSources = files.length;
      const phoneConfig = brands[brand]?.[model];
      const releaseDate = phoneConfig?.releaseDate;

      // Check registry for previous enrichment
      const regEntry = registry[phoneId];

      if (!regEntry) {
        // Never enriched - add to queue
        queue.push({ phoneId, brand, model, currentSources, previousSources: 0, releaseDate, reason: "new" });
        continue;
      }

      // Already enriched - check if content file exists
      const previousSources = regEntry.processingStats?.totalUrlsProcessed ?? 0;

      // Check if output file exists
      const outputDir = `data/processed_content/${phoneId}`;
      const outputFile = `${outputDir}/${regEntry.filename || `${phoneId}.json`}`;
      let fileExists = false;
      try {
        await stat(outputFile);
        fileExists = true;
      } catch {
        fileExists = false;
      }

      if (!fileExists) {
        queue.push({ phoneId, brand, model, currentSources, previousSources, releaseDate, reason: "missing_content" });
        continue;
      }

      // Only re-enrich if new sources found
      if (currentSources > previousSources) {
        queue.push({ phoneId, brand, model, currentSources, previousSources, releaseDate, reason: "new_sources" });
      }
      // Otherwise skip - already enriched with same or more sources
    }
  }

  // Sort Priority:
  // 1. "new" or "missing_content" (Priority 1)
  // 2. "new_sources" (Priority 2)
  // 3. Within priority, sort by Source Count (Most Sources First) - Better quality enrichment
  // 4. Finally, sort by Release Date (Newest First)
  queue.sort((a, b) => {
    const priorityA = (a.reason === "new" || a.reason === "missing_content") ? 1 : 2;
    const priorityB = (b.reason === "new" || b.reason === "missing_content") ? 1 : 2;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Prefer richer data (more reviews/specs)
    if (a.currentSources !== b.currentSources) {
      return b.currentSources - a.currentSources;
    }

    const dateA = a.releaseDate ?? "2000-01-01";
    const dateB = b.releaseDate ?? "2000-01-01";
    return dateB.localeCompare(dateA);
  });

  // Log queue status
  const newCount = queue.filter(p => p.reason === "new").length;
  const updateCount = queue.filter(p => p.reason === "new_sources").length;
  const missingCount = queue.filter(p => p.reason === "missing_content").length;
  logger.info("Queue analysis", {
    total: queue.length,
    new: newCount,
    updates: updateCount,
    missing: missingCount,
    limit: BATCH_LIMIT,
    selected: Math.min(queue.length, BATCH_LIMIT),
  });

  // Take top N based on limit
  // Take top N using Brand Diversity Logic
  const batch: typeof queue = [];
  const usedBrands = new Set<string>();

  // Pass 1: One phone per brand
  for (const phone of queue) {
    if (batch.length >= BATCH_LIMIT) { break; }
    if (!usedBrands.has(phone.brand)) {
      batch.push(phone);
      usedBrands.add(phone.brand);
    }
  }

  // Pass 2: Fill remaining slots
  if (batch.length < BATCH_LIMIT) {
    for (const phone of queue) {
      if (batch.length >= BATCH_LIMIT) { break; }
      if (!batch.some(p => p.phoneId === phone.phoneId)) {
        batch.push(phone);
      }
    }
  }

  for (const p of batch) {
    if (p.reason === "new") {
      logger.info("Queued (new)", { phone: `${p.brand} ${p.model}`, sources: p.currentSources });
    } else {
      logger.info("Queued (update)", {
        phone: `${p.brand} ${p.model}`,
        sources: `${p.previousSources} → ${p.currentSources}`,
        newSources: p.currentSources - p.previousSources,
      });
    }
  }

  return batch;
}

// ============================================================================
// RESULT PERSISTENCE (Hybrid's clean separation)
// ============================================================================

async function saveResult(phone: PhoneEntry, result: EnrichmentResult, files: string[]): Promise<void> {
  const dir = `data/processed_content/${normalizePath(phone.brand, phone.model)}`;
  await mkdir(resolve(dir), { recursive: true });

  // Use phoneId as filename (e.g., apple_iphone_15_pro.json)
  const filename = `${phone.phoneId}.json`;
  const outPath = `${dir}/${filename}`;

  // Save result without redundant root-level duplicates
  await writeFile(resolve(outPath), JSON.stringify({
    phoneId: phone.phoneId,
    data: result,
    // REMOVED: confidence, sources, processedAt - already in data.metadata
  }, null, 2));

  // Update registry
  const regPath = "data/processed-phones.json";
  let reg: { phones: Record<string, unknown>; metadata: { totalProcessedPhones: number } };
  try {
    reg = JSON.parse(await readFile(regPath, "utf8"));
  } catch {
    reg = { phones: {}, metadata: { totalProcessedPhones: 0 } };
  }

  reg.phones[phone.phoneId] = {
    phoneId: phone.phoneId,
    brand: phone.brand,
    model: phone.model,
    lastProcessedAt: new Date().toISOString(),
    enrichmentStatus: "completed",
    factsVersion: "v7-Final",
    filename,
    processingStats: {
      totalUrlsProcessed: files.length,
      reviewSources: result.metadata.sourceNames,
      processingTimeMs: result.metadata.processingTimeMs,
    },
    qualityMetrics: {
      confidence: result.metadata.confidence,
      overallScore: result.overallScore,
      category: result.category,
    },
  };

  reg.metadata.totalProcessedPhones = Object.keys(reg.phones).length;
  await writeFile(regPath, JSON.stringify(reg, null, 2));
}

// ============================================================================
// MAIN CLI
// ============================================================================
export async function main(): Promise<void> {
  logger.info("SmartMatch Enrichment Engine v7 - Final");
  logger.info("═".repeat(60));

  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    logger.error("OPENROUTER_API_KEY missing in .env.local");
    process.exit(1);
  }

  // Credit check
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${apiKey}` } });
    if (res.ok) {
      const data = await res.json() as { data?: { credits?: number } };
      const credits = data.data?.credits || 0;
      logger.info("Account status", { credits: `$${credits.toFixed(2)}` });
    }
  } catch { /* ignore */ }

  let phones = await getPhonesNeedingEnrichment();
  // Optional CLI filter: --phone="oneplus 13"
  const phoneArg = process.argv.find(a => a.startsWith("--phone="))?.split("=")[1]?.toLowerCase();

  if (phoneArg) {
    phones = phones.filter(p => `${p.brand} ${p.model}`.toLowerCase().includes(phoneArg));
    logger.info("Filtering queue", { filter: phoneArg, matches: phones.length });
  }

  if (phones.length === 0) {
    logger.info("No phones found (check filter or done)");
    return;
  }

  logger.info("Processing queue", { count: phones.length });

  let totalReviews = 0;
  let success = 0;

  const limit = (await import("p-limit")).default(2); // Process 2 at a time (max concurrency)

  await Promise.all(phones.map((p, i) => limit(async () => {
    logger.info(`[${i + 1}/${phones.length}] ${p.brand} ${p.model} (App: ${i + 1})`);

    try {
      const files = await findReviewFiles(p.brand, p.model);
      if (files.length === 0) {
        logger.warn("No review files", { phone: `${p.brand} ${p.model}` });
        return;
      }

      const result = await enrichPhone(p.brand, p.model, files, { apiKey });
      await saveResult(p, result, files);

      totalReviews += files.length;
      success++;

      logger.info("Done", {
        phone: `${p.brand} ${p.model}`,
        reviews: files.length,
        score: result.overallScore,
        conf: `${(result.metadata.confidence * 100).toFixed(1)}%`,
      });
    } catch (err: unknown) {
      logger.error("Failed", { phone: `${p.brand} ${p.model}`, error: err instanceof Error ? err.message : String(err) });
    }
  })));

  // GENERATE CLEAN REPORT
  const reportPath = "enrichment-report.md";
  const reportContent = `
# 📱 Enrichment Run Report
**Date:** ${new Date().toLocaleString()}
**Status:** ${success === phones.length ? "✅ Success" : "⚠️ Partial Success"}

## Summary
- **Total Phones:** ${phones.length}
- **Successfully Enriched:** ${success}
- **Total Reviews Processed:** ${totalReviews}

## Details
${phones.map((p, i) => `- **${p.brand} ${p.model}**: ${i < success ? "✅ Done" : "❌ Failed"}`).join("\n")}
`;
  await writeFile(reportPath, reportContent.trim());
  logger.info("Report generated", { path: reportPath });

  logger.info("═".repeat(60));
  logger.info("Pipeline complete", { totalReviews, success, total: phones.length });

  // Flush logs before exit
  await logger.flush();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error("[FATAL]", err);
    process.exit(1);
  });
}

// Exports for library/testing
export { enrichPhone as enrich, enrichPhone as enrichBatch, logger };
