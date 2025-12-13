#!/usr/bin/env node
/**
 * SmartMatch Discovery v6 - Production Refactored Version
 *
 * PHILOSOPHY:
 * - Genuine simplification over compression
 * - Maintainable and readable production code
 * - Zero functional changes from v4
 * - Optimized for long-term maintenance
 *
 * KEY IMPROVEMENTS:
 * - Unified validation pipeline (3 functions → 1 clean validator)
 * - Computed configuration (no hardcoded threshold maps)
 * - Simplified logging (functional over class-based)
 * - Removed dead code (manual queue, priority calculator)
 * - Streamlined network layer (single throttle method)
 * - Cleaner phase orchestration (same logic, better structure)
 */

import { config } from "dotenv";
import axios, { type AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import * as cheerio from "cheerio";
import { promises as fs, constants as fsConstants, existsSync, readFileSync, writeFileSync, renameSync } from "fs";
import * as pathModule from "path";
import { z } from "zod";
import * as https from "https";

// Load environment - simplified for npx tsx execution
config({ path: ".env.local" });

// Telemetry imports removed as they are not used (using local createTelemetry)

//=============================================================================
// CONFIGURATION
//=============================================================================

const CONFIG = {
  TIMEOUTS: {
    DEFAULT: 90000,
    LONG: 60000,
    IMAGE_DOWNLOAD: 30000, // 30 seconds for image downloads
  },
  LIMITS: {
    MAX_RETRIES: 3,
    MIN_CONTENT_LENGTH: 500,
    MAX_CONTENT_SIZE: 100000,
    IMAGE_DOWNLOAD_RETRIES: 3, // Max retries for image downloads
  },
  RATE_LIMITS: {
    CSE: 1000,
    ARCHIVE: 2000,
    SCRAPE: 1000,
    DDG: 10000,  // 10s delay - DDG blocks automated requests
  },
  PATHS: {
    DATA: "data",
    CONTENT: "data/content",
    LOGS: "logs",
    CONFIG: "data/phones.json",
    FAILURE_CACHE: "data/archive_failures.json",
  },
  USER_AGENTS: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/120.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  ],
  SOURCE_TYPE_ORDER: [
    "gsmarena_specs",
    "gsmarena_review",
    "phonearena_review",
    "dxomark_review",
    "tomsguide_review",
    "techradar_review",
    "theverge_review",
    "notebookcheck_review",
    "androidcentral_review",
    "androidauthority_review",
  ] as string[],
  VARIANT_EXCLUSIONS: {
    "galaxy s25": ["FE", "Ultra", "Plus", "\"S25+\""],
    "galaxy s24": ["FE", "Ultra", "Plus"],
    "galaxy s23": ["FE", "Ultra", "Plus"],
    "iphone 15": ["Pro", "Plus", "Max"],
    "iphone 15 pro": ["Max"],
    "iphone 14": ["Pro", "Plus", "Max"],
    "iphone 14 pro": ["Max"],
    "pixel 9": ["Pro", "XL", "\"-Fold\""],
    "pixel 9 pro": ["XL", "\"-Fold\""],
    "13": ["r", "R", "lite", "Lite", "Pro", "Ultra"], // OnePlus 13R, OnePlus 13 Pro, etc.
  } as Record<string, string[]>,
  BESPOKE_SELECTORS: {
    "gsmarena.com": ".article-body, #review-body, .review-body, #specs-list",
    "phonearena.com": ".content-body, .review-body",
    "dxomark.com": ".article-body-wrapper, article, .article-content, .entry-content, main",
    "tomsguide.com": ".article-body, .page-content, main article, #article-body",
    "techradar.com": "#article-body",
    "theverge.com": ".duet--article--article-body-component, .c-entry-content",
    "notebookcheck.net": ".article_content, #content",
    "androidcentral.com": ".article-body, .article-content",
    "androidauthority.com": ".entry-content, article",
  } as Record<string, string>,
} as const;

// Computed thresholds replace hardcoded maps
function getThresholds(type: string) {
  const isSpecs = type.includes("specs");
  const isDxomark = type.includes("dxomark");

  if (isSpecs) {
    return {
      wordCount: { min: 500, max: 1200 },
      fileSize: { min: 3, max: 6 },
      minContentLength: 200,
    };
  }

  if (isDxomark) {
    return {
      wordCount: { min: 200, max: 1000 },
      fileSize: { min: 4, max: 12 },
      minContentLength: 200,
    };
  }

  // Review thresholds - compute max based on source
  const maxWords =
    type.includes("gsmarena") || type.includes("notebookcheck") ? 27000 :
      type.includes("techradar") ? 13500 :
        type.includes("phonearena") || type.includes("androidcentral") ? 10500 :
          type.includes("theverge") ? 9000 : 7875;

  return {
    wordCount: { min: 2000, max: maxWords },
    fileSize: { min: 12, max: 80 },
    minContentLength: 500,
  };
}



// Invalid URL patterns (consolidated from v4's multiple functions)
const INVALID_URL_PATTERNS = [
  /reddit\.com/,
  /forum\./,
  /\/comments?\//,
  /discussions?\//,
  /community\//,
  /\/news\//,
  /\/update\//,
  /\/announcement\//,
  /\/blog\//,
  /\/opinion\//,
  /-news-/,
  /newscomm/,
];

const VALID_SOURCES = [
  "gsmarena.com",
  "phonearena.com",
  "dxomark.com",
  "theverge.com",
  "androidcentral.com",
  "androidauthority.com",
  "tomsguide.com",
  "techradar.com",
  "notebookcheck.net",
];

//=============================================================================
// TYPES
//=============================================================================

const SourceSchema = z.object({
  cse: z.string().optional(),
  archive: z.string().optional(),
  title: z.string().optional(),
  source: z.string().optional(),
}).passthrough();

const PhoneEntrySchema = z.object({
  releaseDate: z.string().optional(),
  urls: z.record(z.string(), z.array(SourceSchema)).optional(),
}).passthrough();

type Source = z.infer<typeof SourceSchema>;
type PhoneEntry = z.infer<typeof PhoneEntrySchema>;
type PhonesConfig = { brands: Record<string, Record<string, PhoneEntry>> };

interface FailureCacheEntry {
  failedAt: string;
  failureCount: number;
  nextRetry: string;
  retryCount: number;
  attemptedUrls?: string[];
  cdxStrategy?: string;
  lastCdxCall?: string | undefined;
  doNotRetry?: boolean;
  failureReason?: string;
}

type FailureCache = Record<string, FailureCacheEntry>;

enum ValidationFailureReason {
  TOO_SHORT = "word_count_too_low",
  WRONG_TYPE = "wrong_content_type",
  MISSING_KEYWORDS = "missing_brand_or_model",
  FETCH_ERROR = "network_error",
}

// NEW: No Snapshots Cache (auto-healing with Archive.org Save API)
interface NoSnapshotEntry {
  url: string;
  dailyRetries: number;
  lastRetryDate: string;
  saveRequested: boolean;
  saveRequestDates: string[];
  nextRetryDate: string;
  cdxStrategy: string;
  firstSeen: string;
  status: "retrying" | "save_requested" | "waiting" | "exhausted";
}

type NoSnapshotsCache = Record<string, NoSnapshotEntry>;

// NEW: Extraction Failures Cache
interface ExtractionFailureEntry {
  url: string;
  currentSnapshot?: string;
  attemptedSnapshots: string[];
  failureReasons: Record<string, string>;
  lastRetryDate: string;
  dailyRetries: number;
  failureType: "network" | "validation";
  needsManualReview: boolean;
  isPermanent: boolean;
  firstSeen: string;
}

type ExtractionCache = Record<string, ExtractionFailureEntry>;

// NEW: Manual Review Queue




//=============================================================================
// UTILITIES
//=============================================================================

/**
 * Unified URL validation - LZFOF v2
 * Pre-compiled patterns, early returns, reduced allocations
 */
const VARIANT_PATTERNS: Readonly<Record<string, readonly RegExp[]>> = Object.freeze({
  "galaxy s25": [/\bedge\b/i, /\bfe\b/i, /\bultra\b/i, /\bplus\b/i, /\+/],
  "galaxy s24": [/\bedge\b/i, /\bfe\b/i, /\bultra\b/i, /\bplus\b/i, /\+/],
  "iphone 15 pro": [/\bmax\b/i],
  "iphone 15": [/\bpro\b/i, /\bplus\b/i, /\bmax\b/i],
  "13": [/\br\b/i, /\bpro\b/i],
});
const NON_PROFESSIONAL_RE = /\/comment|\/forum/;
const NON_PROFESSIONAL_TITLE_RE = /user opinion|comments/i;

function validateUrl(
  url: string,
  title: string,
  brand: string,
  model: string,
): { valid: boolean; reason?: string } {
  // Early exit: Check invalid patterns first
  for (const pattern of INVALID_URL_PATTERNS) {
    if (pattern.test(url)) { return { valid: false, reason: "invalid_pattern" }; }
  }

  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  const brandLower = brand.toLowerCase();
  const modelLower = model.toLowerCase();
  const fullName = `${brandLower} ${modelLower}`;

  // Check for wrong variant using pre-compiled patterns
  const wrongVariants = VARIANT_PATTERNS[modelLower];
  if (wrongVariants) {
    for (const variantRe of wrongVariants) {
      if (variantRe.test(titleLower)) {
        return { valid: false, reason: "wrong_variant" };
      }
    }
  }

  // Must contain phone name - relaxed matching
  const modelFirstWord = modelLower.split(" ", 1)[0] || modelLower;
  const hasMatch = urlLower.includes(fullName) || titleLower.includes(fullName) ||
    (titleLower.includes(brandLower) && titleLower.includes(modelFirstWord));
  if (!hasMatch) { return { valid: false, reason: "missing_phone_name" }; }

  // Non-professional check
  if (NON_PROFESSIONAL_RE.test(url) || NON_PROFESSIONAL_TITLE_RE.test(title)) {
    return { valid: false, reason: "non_professional" };
  }

  // Valid domain check
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    for (const source of VALID_SOURCES) {
      if (domain.includes(source)) { return { valid: true }; }
    }
    return { valid: false, reason: "invalid_domain" };
  } catch {
    return { valid: false, reason: "invalid_url_format" };
  }
}

function cleanWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/^\s+|\s+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract release date from GSMArena specs HTML
 * LZFOF v2: Pre-compiled patterns and month map, early exit
 */
const MONTH_MAP: Readonly<Record<string, string>> = Object.freeze({
  january: "01", jan: "01", february: "02", feb: "02",
  march: "03", mar: "03", april: "04", apr: "04",
  may: "05", june: "06", jun: "06", july: "07", jul: "07",
  august: "08", aug: "08", september: "09", sep: "09",
  october: "10", oct: "10", november: "11", nov: "11",
  december: "12", dec: "12",
});
const DATE_PATTERNS = [
  /(\d{4}),?\s*(\w+)?/,
  /Released\s*(\d{4})/i,
  /Available\s*(\d{4})/i,
] as const;

function extractReleaseDateFromHTML(html: string): string | null {
  try {
    const $ = cheerio.load(html);
    const cells = $("td.ttl");

    for (let i = 0; i < cells.length; i++) {
      const elem = cells.eq(i);
      const label = elem.text().trim().toLowerCase();
      if (!label.includes("released") && !label.includes("status")) { continue; }

      const value = elem.next("td.nfo").text().trim();
      for (const pattern of DATE_PATTERNS) {
        const match = value.match(pattern);
        if (match) {
          const year = match[1];
          const monthName = match[2]?.toLowerCase();
          const month = (monthName && MONTH_MAP[monthName]) || "01";
          return `${year}-${month}-01`;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}



// LZFOF v3 winner: Hybrid 2-call strategy (71% fewer API calls)
// Evolution results: V1-MegaOR + specs = 2 calls vs 7 (86% reduction, -17% coverage)
// Merged reviews query covers: gsmarena, phonearena, theverge, androidcentral, tomsguide, techradar
const MERGED_REVIEW_SITES = [
  "gsmarena.com",
  "phonearena.com",
  "theverge.com",
  "androidcentral.com",
  "androidauthority.com",
  "tomsguide.com",
  "techradar.com",
  "notebookcheck.net",
];

// Build the OR query for merged review search
const MERGED_REVIEW_QUERY = MERGED_REVIEW_SITES.slice(0, 6).map(s => `site:${s}`).join(" OR ");

// Simplified query generators using hybrid approach
/*
const QUERY_GENS: Record<string, (b: string, m: string, f: string) => string[]> = {
  // Specs: Single targeted query to GSMArena
  gsmarena_specs: (_b, _m, f) => [`site:gsmarena.com "${f}" specs -forum`],

  // Reviews: Merged OR query covering all major sources (LZFOF v3 evolution winner)
  merged_reviews: (_b, _m, f) => [`(${MERGED_REVIEW_QUERY}) "${f}" review`],

  // DXOMark kept separate due to different query pattern
  dxomark_review: (b, m, _f) => [`site:dxomark.com ${b} ${m}`],
};
*/

// Legacy query generators for backward compatibility (if needed)
const LEGACY_QUERY_GENS: Record<string, (b: string, m: string, f: string) => string[]> = {
  gsmarena_review: (_b, _m, f) => [`site:gsmarena.com ${f} review -forum`],
  phonearena_review: (_b, _m, f) => [`site:phonearena.com ${f} review`],
  theverge_review: (_b, _m, f) => [`site:theverge.com ${f} review`],
  androidcentral_review: (_b, _m, f) => [`site:androidcentral.com ${f} review`],
  androidauthority_review: (_b, _m, f) => [`site:androidauthority.com ${f} review`],
  tomsguide_review: (_b, _m, f) => [`site:tomsguide.com ${f} review`],
  techradar_review: (_b, _m, f) => [`site:techradar.com ${f} review`],
  notebookcheck_review: (_b, _m, f) => [`site:notebookcheck.net ${f} review`],
};

/*
function generateCSEQueries(brand: string, model: string, sourceType: string): string[] {
  const fullName = `${brand} ${model}`;
  const modelLower = model.toLowerCase();

  // Use merged reviews for any review type (LZFOF v3 optimization)
  let gen = QUERY_GENS[sourceType];
  if (!gen && sourceType.includes("review") && sourceType !== "dxomark_review") {
    gen = QUERY_GENS["merged_reviews"];
  }
  // Fall back to legacy generators if needed
  if (!gen) {
    gen = LEGACY_QUERY_GENS[sourceType];
  }

  let queries = gen
    ? gen(brand, model, fullName)
    : [`"${fullName}" ${sourceType.replace(/_/g, " ")} review`];

  // Apply variant exclusions
  const exclusions = CONFIG.VARIANT_EXCLUSIONS[modelLower] || [];
  if (exclusions.length > 0 && !exclusions.some(ex => modelLower.includes(ex.toLowerCase()))) {
    const excStr = exclusions.map(ex => `-intitle:"${ex}" -inurl:${ex}`).join(" ");
    queries = queries.map(q => `${q} ${excStr}`);
  }

  return queries;
}
*/

// Failure cache operations (LZFOF v2 winner: sync with existsSync guard)
function loadFailureCache(): FailureCache {
  if (!existsSync(CONFIG.PATHS.FAILURE_CACHE)) { return {}; }
  try {
    return JSON.parse(readFileSync(CONFIG.PATHS.FAILURE_CACHE, "utf8"));
  } catch {
    return {};
  }
}

// LZFOF v2 winner: sync with atomic rename
function saveFailureCache(cache: FailureCache): void {
  const tmpPath = `${CONFIG.PATHS.FAILURE_CACHE}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(cache, null, 2), "utf8");
  renameSync(tmpPath, CONFIG.PATHS.FAILURE_CACHE);
}

function shouldSkipUrl(cache: FailureCache, url: string): boolean {
  const entry = cache[url];
  if (!entry) { return false; }
  if (entry.doNotRetry) { return true; }
  return new Date(entry.nextRetry).getTime() > Date.now();
}

function cacheArchiveFailure(
  cache: FailureCache,
  url: string,
  attemptedUrls?: string[],
  cdxStrategy?: string,
  failureReason?: ValidationFailureReason,
): void {
  const now = new Date();
  const existing = cache[url];
  const failureCount = existing ? existing.failureCount + 1 : 1;
  const retryCount = existing ? existing.retryCount + 1 : 1;

  const doNotRetry = failureReason === ValidationFailureReason.WRONG_TYPE;
  const backoffHours = [1, 6, 24, 168, 720][Math.min(failureCount - 1, 4)] || 1;
  const nextRetry = new Date(now.getTime() + backoffHours * 3600000);

  const cacheEntry: FailureCacheEntry = {
    failedAt: now.toISOString(),
    failureCount,
    nextRetry: nextRetry.toISOString(),
    retryCount,
    attemptedUrls: attemptedUrls || existing?.attemptedUrls || [],
    cdxStrategy: cdxStrategy || existing?.cdxStrategy || "recent",
    lastCdxCall: attemptedUrls ? now.toISOString() : (existing?.lastCdxCall || undefined),
  };

  if (doNotRetry || existing?.doNotRetry) {
    cacheEntry.doNotRetry = true;
  }
  if (failureReason || existing?.failureReason) {
    cacheEntry.failureReason = (failureReason as string) || (existing ? existing.failureReason : undefined) || "";
  }

  cache[url] = cacheEntry;
  saveFailureCache(cache);
}

// LZFOF v2: Sync cache operations for reliability (matches loadFailureCache pattern)
const NO_SNAPSHOTS_CACHE_PATH = pathModule.join(process.cwd(), "data", "no_snapshots_cache.json");
const EXTRACTION_CACHE_PATH = pathModule.join(process.cwd(), "data", "extraction_failures_cache.json");

function loadNoSnapshotsCache(): NoSnapshotsCache {
  try {
    if (!existsSync(NO_SNAPSHOTS_CACHE_PATH)) { return {}; }
    return JSON.parse(readFileSync(NO_SNAPSHOTS_CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveNoSnapshotsCache(cache: NoSnapshotsCache): void {
  const tmpPath = `${NO_SNAPSHOTS_CACHE_PATH}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(cache, null, 2), "utf8");
  renameSync(tmpPath, NO_SNAPSHOTS_CACHE_PATH);
}

function loadExtractionCache(): ExtractionCache {
  try {
    if (!existsSync(EXTRACTION_CACHE_PATH)) { return {}; }
    return JSON.parse(readFileSync(EXTRACTION_CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveExtractionCache(cache: ExtractionCache): void {
  const tmpPath = `${EXTRACTION_CACHE_PATH}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(cache, null, 2), "utf8");
  renameSync(tmpPath, EXTRACTION_CACHE_PATH);
}

// NEW: Manual Review Queue helpers


// LZFOF v1 winner: Using native fetch instead of axios (21% faster)
async function requestArchiveSave(url: string): Promise<boolean> {
  const accessKey = process.env["IA_ACCESS_KEY"];
  const secretKey = process.env["IA_SECRET_KEY"];

  if (!accessKey || !secretKey) {
    logger.warn("SAVE_API", "Archive.org credentials missing. Skipping save request.");
    return false;
  }

  logger.info("SAVE_API", `Requesting Archive.org to save: ${url.slice(0, 60)}...`);

  try {
    const response = await fetch("https://web.archive.org/save/", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Authorization": `LOW ${accessKey}:${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "SmartMatch Discovery Bot/1.0",
      },
      body: `url=${encodeURIComponent(url)}`,
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      logger.success("SAVE_API", "Archive save requested successfully");
      return true;
    }

    logger.warn("SAVE_API", `Unexpected status: ${response.status}`);
    return false;
  } catch (e: unknown) {
    logger.warn("SAVE_API", `Save request failed: ${(e as Error).message}`);
    return false;
  }
}

// NEW: Utility to add days to date
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0] || "";
}

//=============================================================================
// LOGGING (Simplified functional approach)
//=============================================================================

function createLogger(name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const logFile = pathModule.join(CONFIG.PATHS.LOGS, `${name}_${timestamp}.log`);
  const startTime = Date.now();

  fs.mkdir(CONFIG.PATHS.LOGS, { recursive: true }).catch(() => { });

  const write = (level: string, phase: string, msg: string, meta?: any) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
    const elapsed = Date.now() - startTime;

    const emoji = level === "ERROR" ? "❌" : level === "WARNING" ? "⚠️" :
      level === "SUCCESS" ? "✅" : "ℹ️";
    const color = level === "ERROR" ? "\x1b[31m" : level === "WARNING" ? "\x1b[33m" :
      level === "SUCCESS" ? "\x1b[32m" : "\x1b[36m";
    const reset = "\x1b[0m";

    console.log(`${emoji} ${color}[${phase}]${reset} [${timeStr}] ${msg}`);

    const entry = JSON.stringify({
      timestamp: now.toISOString(),
      level,
      phase,
      msg,
      meta,
      elapsed,
    });
    fs.appendFile(logFile, entry + "\n", "utf8").catch(() => { });
  };

  return {
    init: async () => {
      try {
        await fs.access(CONFIG.PATHS.LOGS, fsConstants.W_OK);
      } catch {
        console.error(`❌ ERROR: Cannot write to log directory: ${CONFIG.PATHS.LOGS}`);
      }
    },
    info: (phase: string, msg: string, meta?: any) => write("INFO", phase, msg, meta),
    success: (phase: string, msg: string, meta?: any) => write("SUCCESS", phase, msg, meta),
    warn: (phase: string, msg: string, meta?: any) => write("WARNING", phase, msg, meta),
    error: (phase: string, msg: string, meta?: any) => write("ERROR", phase, msg, meta),
  };
}


//=============================================================================
// TELEMETRY (Simplified functional approach)
//=============================================================================

function createTelemetry(logger: ReturnType<typeof createLogger>) {
  const metrics = {
    cseCalls: 0,
    archiveHits: 0,
    scrapeSuccess: 0,
    scrapeFailure: 0,
    heroDownloads: 0,
    heroSkipped: 0,
    heroFailed: 0,
    urlRejected: 0,
    startTime: Date.now(),
  };

  return {
    increment: (key: keyof Omit<typeof metrics, "startTime">) => {
      metrics[key]++;
    },
    logSummary: () => {
      const durationSeconds = (Date.now() - metrics.startTime) / 1000;
      logger.info("TELEMETRY", "Session Summary", metrics);
      console.log("\n📊 TELEMETRY SUMMARY");
      console.log(`   CSE Calls:         ${metrics.cseCalls}`);
      console.log(`   Archive Hits:      ${metrics.archiveHits}`);
      console.log(`   Scrape Success:    ${metrics.scrapeSuccess}/${metrics.scrapeSuccess + metrics.scrapeFailure}`);
      console.log(`   Hero Images:       ${metrics.heroDownloads} downloaded, ${metrics.heroSkipped} cached, ${metrics.heroFailed} failed`);
      console.log(`   Duration:          ${durationSeconds.toFixed(1)}s\n`);
    },
  };
}

const logger = createLogger("discovery_v6");
const telemetry = createTelemetry(logger);

//=============================================================================
// NETWORK LAYER
//=============================================================================

class Network {
  private client: AxiosInstance;
  private lastRequest = { cse: 0, archive: 0, scrape: 0, ddg: 0 };
  private cdxCache = new Map<string, string[]>();  // NEW: CDX response cache
  private cseCache = new Map<string, { results: Source[]; timestamp: number; }>(); // PERFECT: CSE query caching

  constructor() {
    const httpsAgent = new https.Agent({ keepAlive: true });
    const userAgent = CONFIG.USER_AGENTS[Math.floor(Math.random() * CONFIG.USER_AGENTS.length)];

    this.client = axios.create({
      timeout: CONFIG.TIMEOUTS.DEFAULT,
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/json,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      } as Record<string, string>,
      httpsAgent,
    });

    axiosRetry(this.client, {
      retries: CONFIG.LIMITS.MAX_RETRIES,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isRetryableError(error) ||
          (error.response?.status ? error.response.status >= 500 : false) ||
          error.response?.status === 429;
      },
    });
  }

  // Unified throttle method (replaces v4's throttle + throttleWithJitter)
  private async throttle(
    key: keyof typeof this.lastRequest,
    ms: number,
    jitter = false,
  ) {
    const elapsed = Date.now() - this.lastRequest[key];
    const delay = jitter ? Math.floor(ms * (0.5 + Math.random())) : ms;
    const wait = Math.max(0, delay - elapsed);
    if (wait > 0) { await new Promise(r => setTimeout(r, wait)); }
    this.lastRequest[key] = Date.now();
  }

  async get(url: string): Promise<string> {
    const isArchive = url.includes("archive.org");
    const key = isArchive ? "archive" : "scrape";
    const rateLimit = isArchive ? CONFIG.RATE_LIMITS.ARCHIVE : CONFIG.RATE_LIMITS.SCRAPE;

    await this.throttle(key, rateLimit);

    try {
      const res = await this.client.get(url, { responseType: "text" });
      return res.data;
    } catch (error: any) {
      throw new Error(`HTTP ${error.response?.status || "Network Error"}: ${url}`);
    }
  }

  async getBinary(url: string, timeoutMs?: number): Promise<Buffer> {
    const isArchive = url.includes("archive.org");
    const key = isArchive ? "archive" : "scrape";
    const rateLimit = isArchive ? CONFIG.RATE_LIMITS.ARCHIVE : CONFIG.RATE_LIMITS.SCRAPE;

    await this.throttle(key, rateLimit);

    try {
      const res = await this.client.get(url, {
        responseType: "arraybuffer",
        timeout: timeoutMs ?? CONFIG.TIMEOUTS.DEFAULT,
      });
      return Buffer.from(res.data);
    } catch (error: any) {
      throw new Error(`HTTP ${error.response?.status || "Network Error"}: ${url}`);
    }
  }
  async searchGoogleCSE(query: string, start = 1, num = 10): Promise<Source[]> {
    await this.throttle("cse", CONFIG.RATE_LIMITS.CSE);

    // PERFECTED: Check CSE cache first (composite key for pagination)
    const cacheKey = `${query.toLowerCase()}_s${start}_n${num}`;
    const cachedResult = this.cseCache.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < 3600000) { // 1 hour cache
      logger.info("PHASE 1", `CSE Cache hit: "${query.substring(0, 50)}..." (Page ${Math.ceil(start / 10)})`);
      return cachedResult.results;
    }

    const apiKey = process.env["CUSTOM_SEARCH_API_KEY"];
    const cx = process.env["SEARCH_ENGINE_ID"];

    if (!apiKey || !cx) {
      throw new Error("Missing Custom Search credentials");
    }

    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=${num}&start=${start}`;
      telemetry.increment("cseCalls");
      logger.info("PHASE 1", `CSE Query: "${query}" (Page ${Math.ceil(start / 10)})`);
      const res = await this.client.get(url);
      const data = res.data;
      const results = (data.items || []).map((item: any) => ({
        cse: item.link,
        title: item.title,
        source: new URL(item.link).hostname.replace("www.", ""),
      }));

      // PERFECTED: Cache the results
      this.cseCache.set(cacheKey, {
        results,
        timestamp: Date.now(),
      });

      logger.info("PHASE 1", `CSE Results: ${results.length} found`);
      return results;
    } catch (err: any) {
      logger.warn("PHASE 1", `CSE Error: ${err.message}`);
      return [];
    }
  }

  async searchBing(query: string, start = 1, num = 10): Promise<Source[]> {
    await this.throttle("cse", CONFIG.RATE_LIMITS.CSE); // Share rate limit or define new one? Sharing is safe for now.

    const apiKey = process.env["BING_API_KEY"];
    if (!apiKey) {
      // Silent fail or throw? Throw so we know to fallback or stop.
      logger.warn("PHASE 1", "Bing API Key missing, skipping fallback");
      return [];
    }

    try {
      const offset = start - 1; // Bing uses 0-based offset
      const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${num}&offset=${offset}`;

      logger.info("PHASE 1", `Bing Query: "${query}" (Page ${Math.ceil(start / 10)})`);

      const res = await this.client.get(url, {
        headers: { "Ocp-Apim-Subscription-Key": apiKey },
      });

      const data = res.data;
      const results = (data.webPages?.value || []).map((item: any) => ({
        cse: item.url,
        title: item.name,
        source: new URL(item.url || "http://unknown").hostname.replace("www.", ""),
      }));

      logger.info("PHASE 1", `Bing Results: ${results.length} found`);
      return results;
    } catch (err: any) {
      logger.warn("PHASE 1", `Bing Error: ${err.message}`);
      return [];
    }
  }

  async searchDuckDuckGo(query: string): Promise<Source[]> {
    await this.throttle("ddg", CONFIG.RATE_LIMITS.DDG);

    // Rotate user-agent per request to avoid detection
    const userAgent = CONFIG.USER_AGENTS[Math.floor(Math.random() * CONFIG.USER_AGENTS.length)]!;

    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    logger.info("PHASE 1", `DDG Query: "${query}"`);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Use axios directly with browser-like headers
        const res = await this.client.get(ddgUrl, {
          responseType: "text",
          headers: {
            "User-Agent": userAgent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0",
          },
        });
        const html = res.data;
        const $ = cheerio.load(html);
        const results: Source[] = [];

        // Try multiple result selectors as DDG changes markup
        const selectors = [".result .result__a", ".result__title a", ".result a"];

        for (const selector of selectors) {
          $(".result").each((_, el) => {
            if (results.length >= 3) { return; } // Limit to top 3 results

            const a = $(el).find(selector).first();
            if (!a.length) { return; }

            let link = a.attr("href");

            // Unwrap DDG redirect
            if (link?.includes("uddg=")) {
              const urlObj = new URL(link, "https://html.duckduckgo.com");
              const realUrl = urlObj.searchParams.get("uddg");
              if (realUrl) { link = realUrl; }
            }

            if (link?.startsWith("http")) {
              try {
                const source = new URL(link).hostname.replace("www.", "");
                if (VALID_SOURCES.some(v => source.includes(v))) {
                  results.push({
                    cse: link,
                    title: a.text().trim(),
                    source: source,
                  });
                }
              } catch {
                // Invalid URL, skip
              }
            }
          });

          if (results.length > 0) { break; } // Found results, stop trying selectors
        }

        logger.info("PHASE 1", `DDG Results: ${results.length} found`);
        return results;
      } catch (err: any) {
        logger.warn("PHASE 1", `DDG Attempt ${attempt} failed: ${err.message}`);
        if (attempt < 3) {
          const delay = 2000 * Math.pow(2, attempt - 1) + Math.random() * 1000;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    return [];
  }

  async getBestArchiveSnapshotsExhaustive(
    url: string,
    maxSnapshots: number = 20,
    isSpecs: boolean = false,
    fromDate: string = "20200101",
  ): Promise<string[]> {
    // NEW: Check CDX cache first
    const cacheKey = `${url}|${isSpecs}|${fromDate}`;
    if (this.cdxCache.has(cacheKey)) {
      logger.info("PHASE 2", `Using cached CDX response for ${url.substring(0, 60)}...`);
      return this.cdxCache.get(cacheKey)!;
    }

    await this.throttle("archive", CONFIG.RATE_LIMITS.ARCHIVE, true);
    const limit = isSpecs ? -1 : -50;
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&limit=${limit}&from=${fromDate}&fl=timestamp,original,length&filter=statuscode:200`;

    try {
      const res = await this.client.get(cdxUrl);
      telemetry.increment("archiveHits");
      const data = res.data;

      if (Array.isArray(data) && data.length > 1) {
        const results = this.processArchiveResults(data, url, maxSnapshots, isSpecs);
        this.cdxCache.set(cacheKey, results);  // NEW: Store in cache
        return results;
      }

      // FUZZY MATCHING: Try base URL without query params if exact match failed
      const baseUrl = url.split("?")[0] || url;
      if (baseUrl !== url) {
        logger.info("PHASE 2", `No exact match, trying base URL: ${baseUrl.substring(0, 60)}...`);
        const fuzzyUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(baseUrl)}&output=json&limit=${limit}&from=${fromDate}&fl=timestamp,original,length&filter=statuscode:200`;
        const retryRes = await this.client.get(fuzzyUrl);
        const retryData = retryRes.data;

        if (Array.isArray(retryData) && retryData.length > 1) {
          logger.success("PHASE 2", "Found snapshots using base URL!");
          const results = this.processArchiveResults(retryData, baseUrl, maxSnapshots, isSpecs);
          this.cdxCache.set(cacheKey, results);  // NEW: Store in cache
          return results;
        }
      }

      throw new Error("No snapshots found");
    } catch (e: any) {
      throw new Error(`CDX lookup failed: ${e?.message || e}`);
    }
  }

  // LZFOF: Cached currentYear and cutoff outside loop
  private processArchiveResults(data: any[], url: string, maxSnapshots: number, isSpecs: boolean): string[] {
    const rows = data.slice(1);

    if (isSpecs) {
      rows.sort((a, b) => b[0].localeCompare(a[0]));
      const bestRow = rows[0];
      return bestRow ? [`https://web.archive.org/web/${bestRow[0]}/${url}`] : [];
    }

    const currentYear = new Date().getFullYear();
    const cutoffYear = currentYear - 4;

    // Sort: size > recency
    rows.sort((a, b) => {
      const lenA = parseInt(a[2] || "0", 10);
      const lenB = parseInt(b[2] || "0", 10);
      if (lenA !== lenB) { return lenB - lenA; }

      const monthA = a[0].substring(0, 6);
      const monthB = b[0].substring(0, 6);
      if (monthA !== monthB) {
        const yearA = parseInt(monthA.substring(0, 4), 10);
        const yearB = parseInt(monthB.substring(0, 4), 10);
        const recentA = currentYear - yearA;
        const recentB = currentYear - yearB;
        if (recentA !== recentB) { return recentA - recentB; }
      }

      return b[0].localeCompare(a[0]);
    });

    const diverse: string[] = [];
    const seenMonths = new Set<string>();
    const minSnapshots = Math.min(5, maxSnapshots);

    for (const row of rows) {
      const month = row[0].substring(0, 6);
      const yearNum = parseInt(month.substring(0, 4), 10);

      // Skip very old archives unless we need more results
      if (diverse.length >= 3 && yearNum < cutoffYear) { continue; }

      if (!seenMonths.has(month) || diverse.length < minSnapshots) {
        diverse.push(`https://web.archive.org/web/${row[0]}/${url}`);
        seenMonths.add(month);
      }
      if (diverse.length >= maxSnapshots) { break; }
    }

    return diverse;
  }
}

const net = new Network();

//=============================================================================
// CONTENT ENGINE - LZFOF v2: Pre-compiled patterns, reduced allocations
//=============================================================================

const WAYBACK_TOOLBAR_RE = /<!-- BEGIN WAYBACK TOOLBAR INSERT -->[\s\S]*?<!-- END WAYBACK TOOLBAR INSERT -->/;
const ARCHIVE_URL_RE = /\/web\/\d+\/(https?:\/\/)?([^/]+)/;
const COMMA_RE = /,/g;
const DOT_RE = /\./g;
const POSITIVE_CLASS_RE = /article|content|body|review|main/i;
const NEGATIVE_CLASS_RE = /footer|nav|sidebar/i;
const WHITESPACE_RE = /\s+/;
const NUMERIC_RE = /^\d+$/;

class ContentEngine {
  static extract(html: string, url?: string, type: string = "review"): string {
    const cleanHtml = html.replace(WAYBACK_TOOLBAR_RE, "");
    const $ = cheerio.load(cleanHtml);
    $("script, style, nav, footer, header, aside, iframe").remove();

    if (url) {
      let hostname = new URL(url).hostname.replace("www.", "");

      // Extract original hostname from archive.org URLs
      if (hostname.includes("archive.org")) {
        const match = url.match(ARCHIVE_URL_RE);
        if (match) { hostname = match[2]!.replace("www.", ""); }
      }

      // Try bespoke selectors first
      const thresholds = getThresholds(type);
      for (const [domain, selector] of Object.entries(CONFIG.BESPOKE_SELECTORS)) {
        if (hostname.includes(domain)) {
          const content = $(selector).text().trim();
          if (content.length > thresholds.minContentLength) {
            return cleanWhitespace(content.slice(0, CONFIG.LIMITS.MAX_CONTENT_SIZE));
          }
        }
      }
    }

    // Fallback: score-based extraction
    let bestText = "";
    let maxScore = 0;

    $("p, div, article, section").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length < 50) { return; }

      let score = text.length * 0.5;
      score += (text.match(COMMA_RE)?.length || 0) * 5;
      score += (text.match(DOT_RE)?.length || 0) * 5;

      const className = $(el).attr("class")?.toLowerCase() || "";
      if (POSITIVE_CLASS_RE.test(className)) { score += 50; }
      if (NEGATIVE_CLASS_RE.test(className)) { score -= 100; }

      if (score > maxScore) {
        maxScore = score;
        bestText = text;
      }
    });

    return cleanWhitespace(bestText.slice(0, CONFIG.LIMITS.MAX_CONTENT_SIZE));
  }

  static validate(text: string, brand: string, model: string, type: string): boolean {
    const thresholds = getThresholds(type);
    if (text.length < thresholds.minContentLength) { return false; }

    const wordCount = text.split(WHITESPACE_RE).length;
    if (wordCount < thresholds.wordCount.min) { return false; }

    const lower = text.toLowerCase();
    const brandLower = brand.toLowerCase();
    const modelLower = model.toLowerCase();

    // LZFOF Fix: Helper for word boundary checking (prevents false positives on concatenated words)
    const hasWordBoundary = (haystack: string, needle: string): boolean => {
      const idx = haystack.indexOf(needle);
      if (idx === -1) { return false; }
      // Check character before (must be non-alphanumeric or start of string)
      const before = idx === 0 || !/[a-z0-9]/i.test(haystack[idx - 1]!);
      // Check character after (must be non-alphanumeric or end of string)
      const afterIdx = idx + needle.length;
      const after = afterIdx >= haystack.length || !/[a-z0-9]/i.test(haystack[afterIdx]!);
      return before && after;
    };

    // Check for model parts - pre-filter model parts
    const modelParts = modelLower.split(" ").filter(p => NUMERIC_RE.test(p) || p.length > 2);

    for (const part of modelParts) {
      if (NUMERIC_RE.test(part)) {
        // For numbers, check with word boundaries
        if (hasWordBoundary(lower, part)) {
          return true;
        }
      } else if (hasWordBoundary(lower, part)) {
        // LZFOF Fix: Use word boundary check instead of simple includes
        return true;
      }
    }

    // Also check brand with word boundary
    return hasWordBoundary(lower, brandLower);
  }
}

//=============================================================================
// ORCHESTRATOR
//=============================================================================

class Orchestrator {
  private config?: PhonesConfig;

  async loadConfig(): Promise<PhonesConfig> {
    try {
      const raw = await fs.readFile(CONFIG.PATHS.CONFIG, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      throw new Error(
        `Failed to load config from ${CONFIG.PATHS.CONFIG}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async saveConfig(config: PhonesConfig): Promise<void> {
    await fs.writeFile(CONFIG.PATHS.CONFIG, JSON.stringify(config, null, 2), "utf8");
  }

  normalizePath(brand: string, model: string): string {
    return pathModule.join(
      CONFIG.PATHS.CONTENT,
      `${brand}_${model}`.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-_.]/g, ""),
    );
  }

  //===========================================================================
  // PHASE 1: CSE Discovery
  //===========================================================================

  // Helper for search fallback strategy (Google CSE -> Bing)
  private async searchWithFallback(query: string, start: number, limit: number): Promise<Source[]> {
    try {
      const results = await net.searchGoogleCSE(query, start, limit);
      if (results.length > 0) { return results; }

      // Fallback to Bing if Google returns nothing
      logger.info("PHASE 1", "Google CSE empty, trying Bing fallback...");
      return await net.searchBing(query, start, limit);
    } catch (e: any) {
      logger.warn("PHASE 1", `Google CSE failed: ${e.message}, trying Bing...`);
      return await net.searchBing(query, start, limit);
    }
  }

  async runPhase1() {
    logger.info("PHASE 1", "Starting CSE Discovery (Parallel)");
    if (!this.config) { throw new Error("Config not initialized"); }

    // Diagnostic: Check CSE credentials
    const hasCSEKey = !!process.env["CUSTOM_SEARCH_API_KEY"];
    const hasCSEId = !!process.env["SEARCH_ENGINE_ID"];
    const hasBingKey = !!process.env["BING_API_KEY"];

    logger.info("PHASE 1", "Credentials Check", {
      hasGoogle: hasCSEKey && hasCSEId,
      hasBing: hasBingKey,
    });

    if (!hasCSEKey && !hasBingKey) {
      logger.warn("PHASE 1", "No search credentials available!");
      return;
    }

    let modified = false;
    let phonesProcessed = 0;

    // 1. Identification Phase: Find all phones that need work
    const pendingPhones: Array<{ brand: string; model: string; releaseDate: string; sourceCount: number }> = [];

    for (const brand in this.config.brands) {
      for (const model in this.config.brands[brand]) {
        const entry = this.config.brands[brand][model];
        if (!entry) { continue; }
        phonesProcessed++;

        // Check if any url type is missing and count existing sources
        let needsWork = false;
        let sourceCount = 0;

        if (!entry.urls) {
          needsWork = true;
        } else {
          for (const type of CONFIG.SOURCE_TYPE_ORDER) {
            if (entry.urls[type] && Array.isArray(entry.urls[type]) && entry.urls[type].length > 0) {
              sourceCount++;
            } else {
              needsWork = true;
            }
          }
        }

        if (needsWork) {
          pendingPhones.push({
            brand,
            model,
            releaseDate: entry.releaseDate || "1970-01-01",
            sourceCount,
          });
        }
      }
    }

    // 2. Prioritization Phase: Sort by Need (Fewest Sources First) -> Recency (Newest First)
    // This prioritizes "empty" phones to get them started, while still preferring flagships.
    pendingPhones.sort((a, b) => {
      // Primary: Fewest sources first (0 sources > 1 source)
      if (a.sourceCount !== b.sourceCount) {
        return a.sourceCount - b.sourceCount;
      }
      // Secondary: Newest first (S25 > S24)
      return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
    });

    // 3. Selection Phase: Pick top 4 with Brand Diversity
    // We want to avoid processing 4 iPhones in a row.
    // Instead, we try to pick the newest phone from 4 DIFFERENT brands if possible.
    const MAX_PHONES_PER_RUN = 4;
    const selectedPhones: typeof pendingPhones = [];
    const usedBrands = new Set<string>();

    // Pass 1: One phone per brand
    for (const phone of pendingPhones) {
      if (selectedPhones.length >= MAX_PHONES_PER_RUN) { break; }
      if (!usedBrands.has(phone.brand)) {
        selectedPhones.push(phone);
        usedBrands.add(phone.brand);
      }
    }

    // Pass 2: Fill remaining slots with next newest phones (duplicates allowed if needed)
    if (selectedPhones.length < MAX_PHONES_PER_RUN) {
      for (const phone of pendingPhones) {
        if (selectedPhones.length >= MAX_PHONES_PER_RUN) { break; }
        // Check if not already included (by direct reference or ID)
        if (!selectedPhones.some(p => p.brand === phone.brand && p.model === phone.model)) {
          selectedPhones.push(phone);
        }
      }
    }

    // 4. Legendary Discovery V7: Dragnet & Sniper Architecture
    logger.info("PHASE 1", `Starting Legendary Discovery V7 for ${selectedPhones.length} phones`);

    // Map domains to their source types for smart distribution
    const DOMAIN_TO_TYPE: Record<string, string> = {
      "gsmarena.com": "gsmarena_review",
      "phonearena.com": "phonearena_review",
      "dxomark.com": "dxomark_review",
      "tomsguide.com": "tomsguide_review",
      "techradar.com": "techradar_review",
      "theverge.com": "theverge_review",
      "notebookcheck.net": "notebookcheck_review",
      "androidcentral.com": "androidcentral_review",
      "androidauthority.com": "androidauthority_review",
    };

    for (const phone of selectedPhones) {
      const { brand, model } = phone;
      const fullName = `${brand} ${model}`;
      logger.info("PHASE 1", `Processing ${fullName} (Dragnet & Sniper)`);

      const entry = this.config.brands[brand]?.[model];
      if (!entry) { continue; }
      if (!entry.urls) { entry.urls = {}; modified = true; }

      // --- A. FOUNDATION: Specs (GSMArena) ---
      if (!entry.urls["gsmarena_specs"] || entry.urls["gsmarena_specs"].length === 0) {
        // Only run if missing
        try {
          const query = `site:gsmarena.com "${fullName}" specs`;
          const results = await this.searchWithFallback(query, 1, 10);

          // Filter valid only
          const qualified = this.filterResults(results, brand, model);
          if (qualified.length > 0) {
            entry.urls["gsmarena_specs"] = qualified;
            modified = true;
            logger.success("PHASE 1", `[${fullName}] Specs found: ${qualified.length}`);
          } else {
            logger.warn("PHASE 1", `[${fullName}] No specs found`);
          }
        } catch (e: any) {
          logger.warn("PHASE 1", `[${fullName}] Specs search failed: ${e.message}`);
        }
      }

      // --- B. THE DEEP DRAGNET (Reviews) ---
      // 1. Identify which slots are empty
      const emptySlots = Object.values(DOMAIN_TO_TYPE).filter(type =>
        !entry.urls![type] || entry.urls![type]!.length === 0,
      );

      if (emptySlots.length > 0) {
        const dragnetQuery = `(${MERGED_REVIEW_QUERY}) "${fullName}" review`;

        // Progressive Dragnet: Page 1 -> Page 2 -> Page 3
        for (let page = 1; page <= 3; page++) {
          const start = (page - 1) * 10 + 1;
          logger.info("PHASE 1", `[${fullName}] Dragnet Page ${page}...`);

          try {
            // Fetch 10 results
            const results = await this.searchWithFallback(dragnetQuery, start, 10);
            if (results.length === 0) { break; } // No more results

            // Smart Distribution
            let distributedCount = 0;
            for (const result of results) {
              // Find matching type based on domain
              const domain = Object.keys(DOMAIN_TO_TYPE).find(d => result.source?.includes(d));
              if (domain) {
                const type = DOMAIN_TO_TYPE[domain];

                // Check validity
                const validation = validateUrl(result.cse || "", result.title || "", brand, model);
                if (validation.valid) {
                  // Only add if slot is empty or we want to append
                  const urlsForType = entry.urls![type!] || [];
                  if (!entry.urls![type!]) { entry.urls![type!] = urlsForType; }

                  // Avoid duplicates
                  const existingUrl = urlsForType.find(u => u.cse === result.cse);
                  if (!existingUrl) {
                    urlsForType.push(result);
                    modified = true;
                    distributedCount++;
                  }
                }
              }
            }

            logger.info("PHASE 1", `[${fullName}] Dragnet Page ${page} distributed ${distributedCount} links`);

            // Check if we are done (all major slots filled?)
            const remainingEmpty = Object.values(DOMAIN_TO_TYPE).filter(type =>
              !entry.urls![type] || entry.urls![type]!.length === 0,
            );

            if (remainingEmpty.length === 0) {
              logger.success("PHASE 1", `[${fullName}] All slots filled! Stopping Dragnet.`);
              break;
            }

          } catch (e: any) {
            logger.warn("PHASE 1", `[${fullName}] Dragnet Page ${page} failed: ${e.message}`);
          }
        }
      }

      // --- C. THE SNIPER (Fallback) ---
      // Check critical slots only (GSMArena, PhoneArena, Verge)
      const CRITICAL_SNIPER_TARGETS = ["gsmarena_review", "phonearena_review"];

      for (const targetType of CRITICAL_SNIPER_TARGETS) {
        if (!entry.urls![targetType] || entry.urls![targetType]!.length === 0) {
          logger.info("PHASE 1", `[${fullName}] Sniper activating for ${targetType}...`);

          // Generate specific query
          const gen = LEGACY_QUERY_GENS[targetType];
          if (gen) {
            const queries = gen(brand, model, fullName);
            if (queries[0]) {
              try {
                const results = await this.searchWithFallback(queries[0], 1, 10);
                const qualified = this.filterResults(results, brand, model);
                if (qualified.length > 0) {
                  entry.urls![targetType] = qualified;
                  modified = true;
                  logger.success("PHASE 1", `[${fullName}] Sniper hit for ${targetType}`);
                }
              } catch (e: any) {
                logger.warn("PHASE 1", `[${fullName}] Sniper failed for ${targetType}: ${e.message}`);
              }
            }
          }
        }
      }

      // Save periodically per phone to be safe
      if (modified) {
        await this.saveConfig(this.config);
        modified = false;
      }
    }
  }

  // Helper for duplicate code in Legendary V7
  private filterResults(results: Source[], brand: string, model: string): Source[] {
    return results.filter(result => {
      const validation = validateUrl(result.cse || "", result.title || "", brand, model);
      if (!validation.valid) {
        // logger.info("PHASE 1", `Rejected: ${result.cse} (${validation.reason})`);
        return false;
      }

      // Strict variant check for Snipers/Specs (copied from batch logic)
      const modelLower = model.toLowerCase();
      const urlLower = (result.cse || "").toLowerCase();
      const titleLower = (result.title || "").toLowerCase();
      const variants = ["plus", "pro max", "ultra", "pro+", "max"];
      const hasVariantInModel = variants.some(v => modelLower.includes(v));

      if (!hasVariantInModel) {
        const hasVariantInUrl = variants.some(v =>
          urlLower.includes(`-${v}-`) ||
          urlLower.includes(`-${v.replace(" ", "-")}-`) ||
          urlLower.includes(`/${v}/`) ||
          urlLower.includes(`_${v}_`) ||
          titleLower.includes(` ${v} `) ||
          titleLower.includes(` ${v}:`),
        );
        if (hasVariantInUrl) { return false; }
      }
      return true;
    });
  }

  //===========================================================================
  // PHASE 2: Archive Discovery (Progressive Exploration)
  //===========================================================================

  async runPhase2() {
    logger.info("PHASE 2", "Starting Archive Discovery (Optimized Search Patterns)");
    if (!this.config) { throw new Error("Config not initialized"); }

    const noSnapshotsCache = await loadNoSnapshotsCache();
    const today = new Date().toISOString().split("T")[0] || "";

    // PERFECTED: Skip URLs that are unlikely to have archives (reduces unnecessary requests)
    function shouldSkipArchiveSearch(cseUrl: string): boolean {
      const urlLower = cseUrl.toLowerCase();

      // Skip obvious non-professional sources
      if (/\b(forum|forums|thread|post)\b/.test(urlLower)) { return true; }
      if (urlLower.includes("/news/") || urlLower.includes("/blog/")) { return true; }
      if (urlLower.includes("/community/") || urlLower.includes("/discussion")) { return true; }

      // Skip very short URLs (likely redirects or temporary)
      if (cseUrl.length < 25) { return true; }

      // Skip URLs with temporary parameters
      if (cseUrl.includes("?")) { return true; }

      // Skip very old domains (under construction or dead)
      try {
        const url = new URL(cseUrl);
        const domain = url.hostname;

        // Skip forum subdomains
        if (domain.includes("forum.") || domain.includes(".forum")) { return true; }

        // Skip specific known blog/news sites that don't archive well
        const skipDomains = ["blogspot.com", "wordpress.com", "tumblr.com"];
        if (skipDomains.some(d => domain.includes(d))) { return true; }

      } catch {
        return true; // Invalid URL? Skip archive search
      }

      return false;
    }

    for (const brand in this.config.brands) {
      for (const model in this.config.brands[brand]) {
        const entry = this.config.brands[brand][model];
        if (!entry || !entry.urls) { continue; }

        for (const type in entry.urls) {
          const sources = entry.urls[type];
          if (!Array.isArray(sources)) { continue; }

          for (const source of sources) {
            if (source.cse && !source.archive) {
              // PERFECTED: Skip URLs unlikely to have archives
              if (shouldSkipArchiveSearch(source.cse)) {
                logger.info("PHASE 2", `Skipping archive search for: ${source.cse.substring(0, 60)}...(unarchivable pattern)`);
                (source as any)._tempArchiveUrls = [];
                continue;
              }

              const cached = noSnapshotsCache[source.cse];

              // Check if should skip (exhausted, waiting, or already tried today)
              if (cached) {
                if (cached.status === "exhausted") {
                  logger.warn("PHASE 2", "Exhausted (2 save requests made), skipping permanently");
                  continue;
                }

                if (cached.status === "save_requested" && new Date(cached.nextRetryDate) > new Date(today)) {
                  logger.info("PHASE 2", `Waiting for archive save (retry: ${cached.nextRetryDate})`);
                  continue;
                }

                if (cached.lastRetryDate === today) {
                  logger.info("PHASE 2", "Already tried today, skipping");
                  continue;
                }
              }

              try {
                const isSpecs = type.includes("specs");
                const archiveUrls = await net.getBestArchiveSnapshotsExhaustive(
                  source.cse,
                  20,
                  isSpecs,
                  "20200101",
                );

                // Success! Remove from cache
                if (cached) {
                  delete noSnapshotsCache[source.cse];
                  await saveNoSnapshotsCache(noSnapshotsCache);
                  logger.success("PHASE 2", "Found snapshots, cleared from no-snapshots cache");
                }

                (source as any)._tempArchiveUrls = archiveUrls;
                (source as any)._cdxStrategy = "recent";

                logger.success("PHASE 2", `Generated ${archiveUrls.length} snapshots`);
              } catch {
                logger.warn("PHASE 2", `No snapshots for ${source.cse}`);

                // Update or create cache entry
                const entry: NoSnapshotEntry = cached || {
                  url: source.cse!,
                  dailyRetries: 0,
                  lastRetryDate: "",
                  saveRequested: false,
                  saveRequestDates: [],
                  nextRetryDate: today,
                  cdxStrategy: "recent",
                  firstSeen: new Date().toISOString(),
                  status: "retrying",
                };

                // Increment daily retries if new day
                if (entry.lastRetryDate !== today) {
                  entry.dailyRetries++;
                  entry.lastRetryDate = today;
                }

                // Check if should request Archive.org save
                if (entry.dailyRetries >= 3 && !entry.saveRequested) {
                  logger.info("SAVE_API", "3 daily retries failed, requesting Archive.org save");

                  const saved = await requestArchiveSave(source.cse!);
                  if (saved) {
                    entry.saveRequested = true;
                    entry.saveRequestDates.push(today);
                    entry.nextRetryDate = addDays(today, 7);
                    entry.status = "save_requested";
                    entry.dailyRetries = 0;
                    logger.success("SAVE_API", "Save requested, will retry in 7 days");
                  }
                } else if (entry.saveRequested && entry.saveRequestDates.length >= 2) {
                  entry.status = "exhausted";
                  logger.error("PHASE 2", "2 save requests made, marking as exhausted");
                }

                noSnapshotsCache[source.cse] = entry;
                await saveNoSnapshotsCache(noSnapshotsCache);

                (source as any)._tempArchiveUrls = [];
              }
            }
          }
        }
      }
    }
  }

  //===========================================================================
  // PHASE 3: Content Scraping (Smart Caching)
  //===========================================================================

  //===========================================================================
  // PHASE 3: Content Scraping (Smart Caching & Parallelism)
  //===========================================================================

  async runPhase3() {
    logger.info("PHASE 3", "Starting Content Scraping (Smart Caching, Limit: 2)");
    if (!this.config) { throw new Error("Config not initialized"); }

    // const failureCache = await loadFailureCache();
    const extractionCache = await loadExtractionCache();
    const today = new Date().toISOString().split("T")[0] || "";

    // Flatten tasks for parallelism
    interface ScrapeTask {
      brand: string;
      model: string;
      type: string;
      source: Source; // Using Source type from earlier
      fileNumber: number;
    }

    const tasks: ScrapeTask[] = [];

    for (const brand in this.config.brands) {
      for (const model in this.config.brands[brand]) {
        const entry = this.config.brands[brand][model];
        if (!entry || !entry.urls) { continue; }

        // Create numbering map
        const sourceTypes = Object.keys(entry.urls).sort((a, b) => {
          const indexA = CONFIG.SOURCE_TYPE_ORDER.indexOf(a);
          const indexB = CONFIG.SOURCE_TYPE_ORDER.indexOf(b);
          if (indexA === -1 && indexB === -1) { return 0; }
          if (indexA === -1) { return 1; }
          if (indexB === -1) { return -1; }
          return indexA - indexB;
        });

        const sourceTypeNumbers = new Map<string, number>();
        sourceTypes.forEach((type, index) => {
          sourceTypeNumbers.set(type, index + 1);
        });

        for (const type in entry.urls) {
          const fileNumber = sourceTypeNumbers.get(type) || 1;
          const sources = entry.urls[type];
          if (!Array.isArray(sources)) { continue; }

          for (let idx = 0; idx < sources.length; idx++) {
            const source = sources[idx];
            if (!source) { continue; }
            tasks.push({ brand, model, type, source, fileNumber });
          }
        }
      }
    }

    logger.info("PHASE 3", `Queued ${tasks.length} scraping tasks`);

    // Simple p-limit implementation for concurrency control


    // Better Queue Implementation
    const processQueue = async (concurrency: number, tasks: ScrapeTask[]) => {
      const queue = [...tasks];
      const workers = Array(concurrency).fill(null).map(async () => {
        while (queue.length > 0) {
          const task = queue.shift();
          if (task) { await processTask(task); }
        }
      });
      await Promise.all(workers);
    };

    const processTask = async (task: ScrapeTask) => {
      const { brand, model, type, source, fileNumber } = task;
      const dir = this.normalizePath(brand, model);

      // Ensure dir exists (race condition safe since mkdir -p is atomic-ish or idempotent)
      await fs.mkdir(dir, { recursive: true }).catch(() => { });

      // NEW: Check extraction cache for skip conditions
      if (source.cse) {
        const cached = extractionCache[source.cse];
        if (cached) {
          if (cached.isPermanent) {
            logger.warn("PHASE 3", `[${brand} ${model}] Permanent failure (WRONG_TYPE), skipping`);
            return;
          }
          if (cached.lastRetryDate === today) {
            logger.info("PHASE 3", `[${brand} ${model}] Already tried today, skipping`);
            return;
          }
          if (cached.needsManualReview) {
            logger.warn("PHASE 3", `[${brand} ${model}] Needs manual review, skipping`);
            return;
          }
        }
      }

      const archiveUrls = (source as any)._tempArchiveUrls ||
        (source?.archive ? [source.archive] : []);

      // PROGRESSIVE FALLBACK logic
      let finalArchiveUrls = archiveUrls;
      if (finalArchiveUrls.length === 0 && source.cse) {
        logger.info("PHASE 3", `[${brand} ${model}] No archive URLs, trying progressive fallback`);
        const strategies = [
          { fromDate: "20240101", name: "recent" },
          { fromDate: "20220101", name: "2-year" },
          { fromDate: "20200101", name: "5-year" },
        ];
        for (const strategy of strategies) {
          try {
            finalArchiveUrls = await net.getBestArchiveSnapshotsExhaustive(
              source.cse, 20, type.includes("specs"), strategy.fromDate,
            );
            if (finalArchiveUrls.length > 0) { break; }
          } catch { /* ignore */ }
        }
      }

      if (finalArchiveUrls.length === 0) {
        // logger.error("PHASE 3", `[${brand} ${model}] All fallback strategies exhausted`);
        return;
      }

      const filename = `${fileNumber}_${type}.txt`;
      const filepath = pathModule.join(dir, filename);

      // Idempotency check
      try {
        await fs.access(filepath);
        logger.info("PHASE 3", `[${brand} ${model}] Skipping ${filename} - already exists`);

        // Hero Image Check (moved inside idempotency to still check hero even if text exists)
        if (type.includes("specs") && source.archive) {
          const processedDir = dir.replace("data/content", "data/processed_content");
          const heroPath = pathModule.join(processedDir, "hero_1.jpg");
          try { await fs.access(heroPath); }
          catch {
            logger.info("HERO_IMAGE", `[${brand} ${model}] Specs exist but hero missing, downloading...`);
            try {
              const html = await net.get(source.archive);
              await this.saveHeroImage(html, source.archive, dir);
            } catch (e: any) { logger.warn("HERO_IMAGE", `[${brand} ${model}] Failed: ${e.message}`); }
          }
        }
        return;
      } catch {
        // Continue to processing
      }

      // ... (Original logic for processing snapshots would go here, need to include the inner loop)
      // Since I am replacing the block, I must reimplement the snapshot iteration here.

      let extractionSuccess = false;
      const failureEntry: ExtractionFailureEntry = extractionCache[source.cse || ""] || {
        url: source.cse || "",
        attemptedSnapshots: [],
        failureReasons: {},
        lastRetryDate: today,
        dailyRetries: 0,
        failureType: "network",
        needsManualReview: false,
        isPermanent: false,
        firstSeen: new Date().toISOString(),
      };

      // Try snapshots
      // Limit snapshot attempts to avoid endless loops on bad URLs
      const snapshotsToTry = finalArchiveUrls.slice(0, 5);

      for (const snapshot of snapshotsToTry) {
        if (failureEntry.attemptedSnapshots.includes(snapshot)) { continue; }

        try {
          // logger.info("PHASE 3", `[${brand} ${model}] Scraping ${snapshot.substring(0, 60)}...`);
          const html = await net.get(snapshot);
          const content = ContentEngine.extract(html, snapshot, type);

          if (ContentEngine.validate(content, brand, model, type)) {
            await fs.writeFile(filepath, content, "utf8");
            logger.success("PHASE 3", `[${brand} ${model}] Saved ${filename} (${content.length} chars)`);
            telemetry.increment("scrapeSuccess");

            if (type.includes("specs")) {
              await this.saveHeroImage(html, snapshot, dir);
              await this.saveReleaseDate(html, brand, model);
            }

            extractionSuccess = true;
            // Cleanup cache on success
            if (source.cse && extractionCache[source.cse]) {
              delete extractionCache[source.cse];
            }
            break;
          } else {
            failureEntry.failureReasons[snapshot] = "validation_failed";
            failureEntry.attemptedSnapshots.push(snapshot);
          }
        } catch (e: any) {
          failureEntry.failureReasons[snapshot] = `network_error: ${e.message}`;
          failureEntry.attemptedSnapshots.push(snapshot);
        }
      }

      if (!extractionSuccess && source.cse) {
        failureEntry.dailyRetries++;
        failureEntry.lastRetryDate = today;
        if (failureEntry.dailyRetries > 5) { failureEntry.needsManualReview = true; }

        // Re-save cache
        extractionCache[source.cse] = failureEntry;
      }
    };

    // EXECUTE QUEUE
    await processQueue(2, tasks); // Max 2 concurrency as requested

    // Save caches finally
    await saveExtractionCache(extractionCache);
    if (this.config) { await this.saveConfig(this.config); }
  }



  private async saveReleaseDate(html: string, brand: string, model: string): Promise<void> {
    const entry = this.config?.brands[brand]?.[model];
    if (!entry || entry.releaseDate) { return; }

    const releaseDate = extractReleaseDateFromHTML(html);
    if (releaseDate) {
      entry.releaseDate = releaseDate;
      logger.success("PHASE 3", `✨ Extracted release date: ${releaseDate} for ${brand} ${model}`);
    }
  }

  //===========================================================================
  // Hero Image Extraction
  //===========================================================================

  private async saveHeroImage(html: string, archiveUrl: string, dir: string): Promise<void> {
    try {
      logger.info("HERO_IMAGE", "Starting hero image extraction...");

      // Check if image already exists (caching)
      const processedDir = dir.replace("data/content", "data/processed_content");
      const imagePath = pathModule.join(processedDir, "hero_1.jpg");
      try {
        await fs.access(imagePath);
        logger.info("HERO_IMAGE", "Image already exists, skipping download");
        telemetry.increment("heroSkipped");
        return;
      } catch {
        // Image doesn't exist, proceed with download
      }

      const $ = cheerio.load(html);
      logger.info("HERO_IMAGE", "Loaded HTML, looking for image selectors...");

      const src = $("div.specs-photo-main img").attr("src") ||
        $(".specs-phone img").first().attr("src");

      logger.info("HERO_IMAGE", `Found image src: ${src ? src : "null"}`);

      if (!src) {
        logger.info("HERO_IMAGE", "No hero image found in HTML");
        return;
      }

      let imageUrl: string;
      if (src.startsWith("http")) {
        imageUrl = src;
      } else if (src.startsWith("//")) {
        imageUrl = "https:" + src;
      } else {
        const archiveMatch = archiveUrl.match(/\/web\/\d+\/(.+)/);
        const baseUrl = archiveMatch ? archiveMatch[1] : archiveUrl;
        logger.info("HERO_IMAGE", `Constructing URL from relative path: ${src} + base ${baseUrl}`);
        imageUrl = new URL(src, baseUrl).href;
      }

      logger.info("HERO_IMAGE", `Final image URL: ${imageUrl}`);

      // Download with retry logic and timeout
      logger.info("HERO_IMAGE", "Downloading image binary data...");
      const startTime = Date.now();
      let imageData: Buffer | null = null;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= CONFIG.LIMITS.IMAGE_DOWNLOAD_RETRIES; attempt++) {
        try {
          if (attempt > 1) {
            const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 2), 8000); // 2s, 4s, 8s max
            logger.warn("HERO_IMAGE", `Retry attempt ${attempt}/${CONFIG.LIMITS.IMAGE_DOWNLOAD_RETRIES} after ${backoffDelay}ms`);
            await new Promise(r => setTimeout(r, backoffDelay));
          }

          imageData = await net.getBinary(imageUrl, CONFIG.TIMEOUTS.IMAGE_DOWNLOAD);
          const duration = Date.now() - startTime;
          logger.success("HERO_IMAGE", `Downloaded ${Buffer.byteLength(imageData)} bytes in ${duration}ms`);
          break;
        } catch (e: any) {
          lastError = e;
          const duration = Date.now() - startTime;
          logger.warn("HERO_IMAGE", `Attempt ${attempt} failed after ${duration}ms: ${e.message}`);

          if (attempt === CONFIG.LIMITS.IMAGE_DOWNLOAD_RETRIES) {
            throw new Error(`Failed to download image after ${CONFIG.LIMITS.IMAGE_DOWNLOAD_RETRIES} attempts: ${e.message}`);
          }
        }
      }

      if (!imageData) {
        throw lastError || new Error("Image download failed with no error message");
      }

      if (Buffer.byteLength(imageData) < 5120) {
        logger.warn("HERO_IMAGE", `Image too small (${Buffer.byteLength(imageData)} bytes), skipping`);
        return;
      }

      logger.info("HERO_IMAGE", `Original dir: ${dir}`);
      logger.info("HERO_IMAGE", `Target processed dir: ${processedDir}`);

      logger.info("HERO_IMAGE", "Creating directory structure...");
      await fs.mkdir(processedDir, { recursive: true });
      logger.success("HERO_IMAGE", "Directory created successfully");

      logger.info("HERO_IMAGE", `Writing image to: ${imagePath}`);

      await fs.writeFile(imagePath, imageData);
      logger.success("HERO_IMAGE", `Image saved successfully to ${imagePath}`);
      telemetry.increment("heroDownloads");

      // Final verification
      const stats = await fs.stat(imagePath);
      logger.success("HERO_IMAGE", `✅ File exists, size: ${stats.size} bytes`);

    } catch (e: any) {
      logger.error("HERO_IMAGE", `Failed with detailed error: ${e.message}`);
      if (e.stack) {
        logger.error("HERO_IMAGE", `Stack trace: ${e.stack}`);
      }
    }
  }

  //===========================================================================
  // Main Runner
  //===========================================================================

  async run() {
    const args = process.argv.slice(2);
    const forceHeroImages = args.includes("--force-hero-images");

    logger.info("STARTUP", "Validating environment configuration...");

    await fs.mkdir(CONFIG.PATHS.DATA, { recursive: true });
    await fs.mkdir(CONFIG.PATHS.LOGS, { recursive: true });
    await fs.mkdir(CONFIG.PATHS.CONTENT, { recursive: true });

    const hasCSEKey = !!process.env["CUSTOM_SEARCH_API_KEY"];
    const hasCSEId = !!process.env["SEARCH_ENGINE_ID"];

    if (!hasCSEKey || !hasCSEId) {
      logger.warn("STARTUP", "Custom Search credentials not configured");
      logger.warn("STARTUP", "→ DuckDuckGo primary (recommended)");
    } else {
      logger.success("STARTUP", "Google CSE configured as fallback");
    }

    logger.success("STARTUP", "Environment validation complete");

    try {
      this.config = await this.loadConfig();
      await this.runPhase1();
      await this.runPhase2();
      await this.runPhase3();

      if (forceHeroImages) {
        logger.info("MAIN", "Force-reprocessing hero images for all specs...");
        await this.forceRedownloadHeroImages();
      }

      logger.success("PIPELINE", "Discovery Complete");
      telemetry.logSummary();
    } catch (e: any) {
      logger.error("MAIN", "Fatal Error", { error: e.message });
      telemetry.logSummary();
    }
  }

  async forceRedownloadHeroImages() {
    logger.info("FORCED_HERO", "Starting forced hero image redownload");

    for (const brand in this.config!.brands) {
      for (const model in this.config!.brands[brand]) {
        const entry = this.config!.brands[brand][model];
        if (!entry || !entry.urls) { continue; }

        const dir = this.normalizePath(brand, model);

        for (const type in entry.urls) {
          if (type.includes("specs")) {
            const sources = entry.urls[type];
            if (!Array.isArray(sources)) { continue; }

            for (const source of sources) {
              if (source.archive) {
                try {
                  logger.info("FORCED_HERO", `Redownloading hero for ${brand} ${model} ${type}`);
                  const html = await net.get(source.archive);
                  await this.saveHeroImage(html, source.archive, dir);
                } catch (e: any) {
                  logger.warn("FORCED_HERO", `Failed for ${brand} ${model}: ${e.message}`);
                }
                // Only process the first specs source
                break;
              }
            }
          }
        }
      }
    }

    logger.success("FORCED_HERO", "Completed forced hero image redownload");
  }
}

//=============================================================================
// ENTRY POINT
//=============================================================================

function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    logger.warn("SYSTEM", `Received ${signal}, shutting down`);
    telemetry.logSummary();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

const orchestrator = new Orchestrator();
setupGracefulShutdown();
logger.init().then(() => orchestrator.run());

export {
  Network,
  ContentEngine,
  Orchestrator,
  CONFIG,
  loadFailureCache,
  saveFailureCache,
  shouldSkipUrl,
  cacheArchiveFailure,
  cleanWhitespace,
  validateUrl,
  getThresholds,
};
