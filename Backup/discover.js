#!/usr/bin/env node
/**
 * SmartMatch AI - Discovery Phase v3.1
 *
 * Advanced phone discovery system with intelligent caching, cross-phase coordination,
 * and comprehensive quality filtering.
 *
 * Features:
 * - Multi-source phone discovery via Google CSE
 * - Cross-phase blacklist management
 * - Intelligent image selection with trust scoring
 * - Advanced price extraction with JSON-LD support
 * - Comprehensive caching and rate limiting
 * - Real-time metrics and monitoring
 * - Configurable limits and thresholds
 *
 * ENV:
 *   GOOGLE_API_KEY, GOOGLE_CSE_ID, BATCH_LIMIT, CONCURRENCY_LIMIT,
 *   CSE_CACHE_TTL, MIN_SOURCES_THRESHOLD, MAX_DISCOVERY_PHONES,
 *   QUERY_DELAY_MS, RETRY_ATTEMPTS, TIMEOUT_MS
 *
 * Production-ready with enterprise-grade error handling and monitoring.
 */

import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import crypto from "crypto";
import pLimit from "p-limit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: '.env.local' });

const DATA_DIR = path.join(process.cwd(), "data");
const PROCESS_REVIEW_PATH = path.join(DATA_DIR, "process-review.json");
const PHONES_PATH = path.join(DATA_DIR, "phones.json");
const CACHE_DIR = path.join(DATA_DIR, "cache");
const CSE_CACHE_PATH = path.join(CACHE_DIR, "cse-cache.json");
const FINGERPRINTS_PATH = path.join(DATA_DIR, "fingerprints.json");
const BLACKLIST_PATH = path.join(DATA_DIR, "blacklist", "images.json");
const QUERY_STATE_PATH = path.join(DATA_DIR, "query-rotation.json");

// API Configuration
const GOOGLE_API_KEY = process.env.CUSTOM_SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.SEARCH_ENGINE_ID;
if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
  console.error("❌ ERROR: Missing required environment variables");
  console.error("   Required: CUSTOM_SEARCH_API_KEY, SEARCH_ENGINE_ID");
  process.exit(1);
}

// Simplified Configuration for Auto-Discovery Only
const CONFIG = {
  // Performance limits
  BATCH_LIMIT: Number(process.env.BATCH_LIMIT || 20),
  CONCURRENCY_LIMIT: Number(process.env.CONCURRENCY_LIMIT || 4),
  CSE_CACHE_TTL: Number(process.env.CSE_CACHE_TTL || 60 * 60 * 1000), // 1 hour
  QUERY_DELAY_MS: Number(process.env.QUERY_DELAY_MS || 1000),
  RETRY_ATTEMPTS: Number(process.env.RETRY_ATTEMPTS || 3),
  TIMEOUT_MS: Number(process.env.TIMEOUT_MS || 15000),

  // Discovery parameters
  MAX_AUTO_DISCOVERY_PHONES: Number(process.env.MAX_AUTO_DISCOVERY_PHONES || 50),
  QUERIES_PER_RUN: Number(process.env.QUERIES_PER_RUN || 1),
  MAX_RESULTS_PER_QUERY: Number(process.env.MAX_RESULTS_PER_QUERY || 10),

  // Auto-discovery specific settings
  AUTO_DISCOVERY_SOURCES_THRESHOLD: Number(process.env.AUTO_DISCOVERY_SOURCES_THRESHOLD || 1),

  // Feature flags
  ENABLE_BLACKLIST: process.env.ENABLE_BLACKLIST !== 'false',
  ENABLE_CACHING: process.env.ENABLE_CACHING !== 'false',
  ENABLE_METRICS: process.env.ENABLE_METRICS !== 'false'
};

// Trusted sources with enhanced scoring
const TRUSTED_SOURCES = {
  specs: ["gsmarena.com", "notebookcheck.net", "anandtech.com", "phonearena.com"],
  camera: ["dxomark.com", "gsmarena.com", "notebookcheck.net", "phonearena.com"],
  battery: ["gsmarena.com", "notebookcheck.net", "dxomark.com", "phonearena.com"],
  image_sources: [
    "gsmarena.com",      // 1.0 - Primary source
    "samsung.com",       // 1.0 - OEM official
    "apple.com",         // 1.0 - OEM official
    "oneplus.com",       // 1.0 - OEM official
    "xiaomi.com",        // 1.0 - OEM official
    "google.com",        // 1.0 - OEM official
    "dxomark.com",       // 0.95 - Professional review
    "notebookcheck.net", // 0.9 - Technical review
    "anandtech.com",     // 0.9 - Technical review
    "phonearena.com",    // 0.9 - Review site
    "amazon.com",        // 0.9 - Major retailer
    "bestbuy.com",       // 0.9 - Major retailer
    "flipkart.com",      // 0.85 - Regional retailer
    "newegg.com",        // 0.85 - Electronics retailer
    "bhphotovideo.com"   // 0.8 - Professional retailer
  ],
  retailers: ["amazon.com", "bestbuy.com", "flipkart.com", "newegg.com", "bhphotovideo.com"]
};

const TRUST_SCORES = {
  "gsmarena.com": 1.0,
  "samsung.com": 1.0,
  "apple.com": 1.0,
  "oneplus.com": 1.0,
  "xiaomi.com": 1.0,
  "google.com": 1.0,
  "dxomark.com": 0.95,
  "notebookcheck.net": 0.9,
  "anandtech.com": 0.9,
  "phonearena.com": 0.9,
  "amazon.com": 0.9,
  "bestbuy.com": 0.9,
  "flipkart.com": 0.85,
  "newegg.com": 0.85,
  "bhphotovideo.com": 0.8
};

// Enhanced year range configuration
const YEARS = [2023, 2024, 2025];
const CURRENT_YEAR = new Date().getFullYear();

/** utilities **/
async function safeReadJson(p, fallback = null) {
  try {
    const s = await fs.readFile(p, "utf8");
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
async function safeWriteJson(p, obj) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(obj, null, 2), "utf8");
}
function normalizeDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }



/** Enhanced CSE wrapper with intelligent caching and advanced retry logic **/
async function loadCseCache() {
  try {
    return await safeReadJson(CSE_CACHE_PATH, { items: {}, meta: { created: new Date().toISOString() } });
  } catch (error) {
    console.warn(`⚠️ Failed to load CSE cache: ${error.message}`);
    return { items: {}, meta: { created: new Date().toISOString() } };
  }
}

async function saveCseCache(cache) {
  try {
    await safeWriteJson(CSE_CACHE_PATH, cache);
  } catch (error) {
    console.warn(`⚠️ Failed to save CSE cache: ${error.message}`);
  }
}

async function fetchCse(query) {
  const startTime = Date.now();
  console.log(`🔍 CSE: Starting query: "${query}"`);

  // Check cache first (if caching enabled)
  if (CONFIG.ENABLE_CACHING) {
    const cache = await loadCseCache();
    const key = sha256Hex(query);
    const entry = cache.items[key];

    if (entry && (Date.now() - entry.ts) < CONFIG.CSE_CACHE_TTL) {
      console.log(`🔍 CSE: Cache hit for query: "${query}" (${Date.now() - startTime}ms)`);
      return entry.data;
    }
  }

  console.log(`🔍 CSE: Cache miss, calling Google CSE API...`);

  // Enhanced API call with configurable parameters
  const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(GOOGLE_API_KEY)}&cx=${encodeURIComponent(GOOGLE_CSE_ID)}&q=${encodeURIComponent(query)}&num=${CONFIG.MAX_RESULTS_PER_QUERY}`;

  // Advanced retry logic with exponential backoff
  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`🔍 CSE: Attempt ${attempt}/${CONFIG.RETRY_ATTEMPTS} for query: "${query}"`);

      const response = await fetch(apiUrl, {
        timeout: CONFIG.TIMEOUT_MS,
        headers: {
          'User-Agent': 'SmartMatchBot/3.1 (+https://smartmatch-pwa.com)'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`CSE API error: ${response.status} - ${errorText}`);

        // Handle different HTTP status codes
        if (response.status === 429) {
          console.warn(`🔍 CSE: Rate limited (429), waiting longer before retry...`);
          await sleep(2000 * attempt); // Longer wait for rate limits
          continue;
        } else if (response.status >= 500) {
          console.warn(`🔍 CSE: Server error (${response.status}), retrying...`);
          await sleep(1000 * attempt);
          continue;
        }

        throw error;
      }

      const json = await response.json();
      const items = json.items || [];
      const duration = Date.now() - startTime;

      console.log(`🔍 CSE: Got ${items.length} results for query: "${query}" (${duration}ms)`);

      // Enhanced result processing with metadata
      const simplified = items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink,
        pagemap: item.pagemap || {},
        meta: {
          query: query,
          fetched_at: new Date().toISOString(),
          source: 'google_cse'
        }
      }));

      // Cache the results (if caching enabled)
      if (CONFIG.ENABLE_CACHING && simplified.length > 0) {
        const cache = await loadCseCache();
        const key = sha256Hex(query);
        cache.items[key] = {
          ts: Date.now(),
          data: simplified,
          meta: { query, result_count: simplified.length }
        };
        cache.meta.last_updated = new Date().toISOString();
        await saveCseCache(cache);
      }

      // Rate limiting between API calls
      await sleep(120);
      console.log(`🔍 CSE: Successfully completed query: "${query}" (${duration}ms)`);
      return simplified;

    } catch (error) {
      console.warn(`🔍 CSE: Attempt ${attempt}/${CONFIG.RETRY_ATTEMPTS} failed: ${error.message}`);

      if (attempt < CONFIG.RETRY_ATTEMPTS) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
        console.log(`🔍 CSE: Waiting ${backoffDelay}ms before retry...`);
        await sleep(backoffDelay);
      } else {
        console.error(`🔍 CSE: All ${CONFIG.RETRY_ATTEMPTS} attempts failed for query: "${query}"`);
        console.error(`   Error: ${error.message}`);
        return [];
      }
    }
  }
}

/** Enhanced HTML fetch with advanced retry logic and error recovery **/
async function fetchHtml(url) {
  const startTime = Date.now();

  // Advanced retry logic with exponential backoff
  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`🌐 Fetching HTML: ${url} (attempt ${attempt}/${CONFIG.RETRY_ATTEMPTS})`);

      const response = await fetch(url, {
        timeout: CONFIG.TIMEOUT_MS,
        headers: {
          'User-Agent': 'SmartMatchBot/3.1 (+https://smartmatch-pwa.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`🌐 Rate limited (${response.status}), waiting longer...`);
          await sleep(2000 * attempt);
          continue;
        } else if (response.status >= 500) {
          console.warn(`🌐 Server error (${response.status}), retrying...`);
          await sleep(1000 * attempt);
          continue;
        }

        console.warn(`🌐 HTTP ${response.status} for ${url}`);
        return null;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('text/html')) {
        console.warn(`🌐 Non-HTML content (${contentType}) for ${url}`);
        return null;
      }

      const html = await response.text();
      const duration = Date.now() - startTime;

      console.log(`🌐 Successfully fetched ${html.length} chars from ${url} (${duration}ms)`);
      return html;

    } catch (error) {
      console.warn(`🌐 Fetch attempt ${attempt} failed for ${url}: ${error.message}`);

      if (attempt < CONFIG.RETRY_ATTEMPTS) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`🌐 Waiting ${backoffDelay}ms before retry...`);
        await sleep(backoffDelay);
      } else {
        console.error(`🌐 All ${CONFIG.RETRY_ATTEMPTS} attempts failed for ${url}`);
        return null;
      }
    }
  }
}

/** Enhanced JSON-LD extraction with multiple schema support **/
function extractJsonLd(html) {
  try {
    const $ = cheerio.load(html);
    const scripts = $("script[type='application/ld+json']").toArray();

    for (const script of scripts) {
      try {
        const data = JSON.parse($(script).text());

        // Handle both array and single object formats
        const candidates = Array.isArray(data) ? data : [data];

        for (const candidate of candidates) {
          // Look for Product or Offer schemas
          if (candidate["@type"] && (
            candidate["@type"] === "Product" ||
            candidate["@type"] === "Offer" ||
            (Array.isArray(candidate["@type"]) && (
              candidate["@type"].includes("Product") ||
              candidate["@type"].includes("Offer")
            ))
          )) {
            return candidate;
          }

          // Also check for schema.org product properties
          if (candidate.name && candidate.offers) {
            return candidate;
          }
        }
      } catch (parseError) {
        // Ignore malformed JSON-LD blocks
        continue;
      }
    }
  } catch (error) {
    console.warn(`⚠️ Error parsing JSON-LD: ${error.message}`);
  }

  return null;
}

/** Enhanced image extraction from multiple sources **/
function extractFirstImageFromPageMap(pagemap) {
  try {
    // Try multiple image sources from pagemap
    const imageSources = [
      pagemap?.cse_image?.[0]?.src,
      pagemap?.image?.[0]?.url,
      pagemap?.schema_image?.[0]?.url,
      pagemap?.og_image?.[0]?.url,
      pagemap?.twitter_image?.[0]?.url
    ];

    for (const imageSrc of imageSources) {
      if (imageSrc && typeof imageSrc === 'string') {
        return imageSrc;
      }
    }
  } catch (error) {
    console.warn(`⚠️ Error extracting image from pagemap: ${error.message}`);
  }

  return null;
}

/** Enhanced price extraction with multiple strategies **/
function extractPriceFromHtml(html, url) {
  try {
    const $ = cheerio.load(html);
    const domain = normalizeDomain(url);

    // Strategy 1: JSON-LD structured data
    const jsonLd = extractJsonLd(html);
    if (jsonLd) {
      const offers = jsonLd.offers || jsonLd;
      if (offers && (offers.price || offers.lowPrice || offers.highPrice)) {
        const price = offers.price || offers.lowPrice || offers.highPrice;
        const currency = offers.priceCurrency || offers.currency || 'USD';
        return {
          price: parseFloat(String(price).replace(/,/g, '')),
          currency: currency,
          source: 'json-ld',
          domain: domain
        };
      }
    }

    // Strategy 2: Schema.org microdata
    const priceElement = $('[itemprop="price"], .price, .product-price, .current-price').first();
    if (priceElement.length) {
      const priceText = priceElement.text().trim();
      const priceMatch = priceText.match(/\$?\s?([\d,]+(?:\.\d{1,2})?)/);
      if (priceMatch) {
        return {
          price: parseFloat(priceMatch[1].replace(/,/g, '')),
          currency: 'USD',
          source: 'schema-microdata',
          domain: domain
        };
      }
    }

    // Strategy 3: Open Graph data
    const ogPrice = $('meta[property="product:price:amount"]').attr('content');
    if (ogPrice) {
      return {
        price: parseFloat(ogPrice),
        currency: 'USD',
        source: 'open-graph',
        domain: domain
      };
    }

    // Strategy 4: Enhanced regex patterns for different retailers
    const pricePatterns = [
      /\$\s?([\d,]+(?:\.\d{1,2})?)/g,  // Standard $ price
      /price[:\s]*\$?\s?([\d,]+(?:\.\d{1,2})?)/gi,  // Price: $X.XX
      /([\d,]+(?:\.\d{1,2})?)\s*(?:USD|dollars?)/gi,  // X.XX USD/dollars
      /now[:\s]*\$?\s?([\d,]+(?:\.\d{1,2})?)/gi  // Now: $X.XX
    ];

    for (const pattern of pricePatterns) {
      const match = pattern.exec(html);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ''));
        if (price > 10 && price < 10000) { // Reasonable price range
          return {
            price: price,
            currency: 'USD',
            source: 'regex-pattern',
            domain: domain
          };
        }
      }
    }

  } catch (error) {
    console.warn(`⚠️ Error extracting price from ${url}: ${error.message}`);
  }

  return null;
}

function snippetPrice(snippet) {
  if (!snippet) return null;

  // Enhanced price extraction from snippets
  const patterns = [
    /\$\s?([\d,]+(?:\.\d{1,2})?)/,  // $X.XX
    /price[:\s]*\$?\s?([\d,]+(?:\.\d{1,2})?)/i,  // Price: $X.XX
    /from[:\s]*\$?\s?([\d,]+(?:\.\d{1,2})?)/i,  // From: $X.XX
    /([\d,]+(?:\.\d{1,2})?)\s*(?:USD|dollars?)/i  // X.XX USD/dollars
  ];

  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price > 10 && price < 10000) { // Reasonable price range
        return price;
      }
    }
  }

  return null;
}

/** Build simple queries - based on working simple version **/
function buildQueriesForPhone(phone) {
  const brand = phone.brand;
  const name = phone.name;

  // Use the same simple queries that work in the test version
  return [
    `${brand} ${name} specs site:gsmarena.com`,
    `${brand} ${name} official site:samsung.com OR site:apple.com OR site:gsmarena.com`,
    `${brand} ${name} price site:amazon.com OR site:bestbuy.com`
  ];
}

/** Blacklist management for rejected images **/
async function loadImageBlacklist() {
  return await safeReadJson(BLACKLIST_PATH, { rejected: [], meta: { created: new Date().toISOString() } });
}

async function saveImageBlacklist(blacklist) {
  await safeWriteJson(BLACKLIST_PATH, blacklist);
}

function isImageBlacklisted(imageUrl, blacklist) {
  return blacklist.rejected.some(entry => entry.url === imageUrl);
}

async function addToBlacklist(imageUrl, reason, phoneName) {
  const blacklist = await loadImageBlacklist();
  if (!isImageBlacklisted(imageUrl, blacklist)) {
    blacklist.rejected.push({
      url: imageUrl,
      reason: reason,
      phone: phoneName,
      blacklisted_at: new Date().toISOString()
    });
    await saveImageBlacklist(blacklist);
    console.log(`🚫 Blacklisted image: ${imageUrl.substring(0, 50)}... (${reason})`);
  }
}



/** choose best image from a set of candidate results **/
async function chooseOfficialImageFromResults(results, phoneName, skipVerification = true) {
  console.log(`🖼️ Finding best image for ${phoneName} (trust-based selection)`);

  // Load blacklist to avoid previously rejected images
  const blacklist = await loadImageBlacklist();

  // prefer gsmarena, then OEM domains, then retailers
  const order = [
    "gsmarena.com",
    "samsung.com",
    "apple.com",
    "oneplus.com",
    "xiaomi.com",
    "amazon.com",
    "bestbuy.com",
    "flipkart.com"
  ];

  // collect candidates with image from pagemap or later fetch
  const candidates = [];
  for (const r of results.slice(0, 3)) { // Limit to top 3 results
    const domain = normalizeDomain(r.link);
    const imgFromPage = extractFirstImageFromPageMap(r.pagemap);
    if (imgFromPage) {
      // Check if image is blacklisted before adding to candidates
      if (isImageBlacklisted(imgFromPage, blacklist)) {
        console.log(`🚫 Skipping blacklisted image: ${imgFromPage.substring(0, 50)}...`);
        continue;
      }
      candidates.push({ src: imgFromPage, domain, sourceLink: r.link, trust: TRUST_SCORES[domain] || 0.6 });
      continue;
    }
    // fallback: fetch page and try to find <meta property="og:image">
    try {
      const html = await fetchHtml(r.link);
      if (html) {
        const $ = cheerio.load(html);
        const og = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
        if (og && !/sample|camera|gallery|thumb/i.test(og)) {
          // Check if image is blacklisted before adding to candidates
          if (isImageBlacklisted(og, blacklist)) {
            console.log(`🚫 Skipping blacklisted image: ${og.substring(0, 50)}...`);
            continue;
          }
          candidates.push({ src: og, domain, sourceLink: r.link, trust: TRUST_SCORES[domain] || 0.6 });
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch HTML for ${r.link}: ${error.message}`);
    }
  }

  if (candidates.length === 0) {
    console.log(`🖼️ No valid (non-blacklisted) images found for ${phoneName}`);
    return null;
  }

  // Use trust-based selection (Qwen Vision verification handled in enrichment phase)
  candidates.sort((a, b) => {
    const ia = order.indexOf(a.domain) === -1 ? 999 : order.indexOf(a.domain);
    const ib = order.indexOf(b.domain) === -1 ? 999 : order.indexOf(b.domain);
    if (ia !== ib) return ia - ib;
    return (b.trust || 0) - (a.trust || 0);
  });

  const best = candidates[0];
  console.log(`🖼️ Selected image: ${best.src.substring(0, 50)}... from ${best.domain} (will be verified in enrichment phase)`);
  return best;
}

/** Auto-discovery functions for 2023-2025 smartphones **/

/**
 * Generate rolling query templates for 3-year window
 */
function generateRollingQueries() {
  const queries = [];

  // Template 1-3: GSMArena by year
  YEARS.forEach(year => {
    queries.push(`"${year} smartphones site:gsmarena.com"`);
  });

  // Template 4-6: NotebookCheck releases by year
  YEARS.forEach(year => {
    queries.push(`"${year} smartphone releases site:notebookcheck.net"`);
  });

  // Template 7: PhoneArena multi-year coverage
  queries.push('"recent phone launches 2023..2025 site:phonearena.com"');

  // Template 8-9: OEM direct announcements
  queries.push('"new Samsung phones 2023..2025 site:samsung.com"');
  queries.push('"new Apple iPhone 2023..2025 site:apple.com"');

  // Template 10: Retailer listings
  queries.push('"2023..2025 smartphones site:amazon.com OR site:flipkart.com"');

  return queries;
}

/**
 * Parse phone information from CSE result title/snippet
 */
function parsePhoneFromResult(result, query) {
  const title = result.title.toLowerCase();
  const snippet = result.snippet.toLowerCase();
  const combined = `${title} ${snippet}`;

  // Enhanced brand patterns with more flexible matching
  const brandPatterns = [
    // Samsung patterns
    { pattern: /\bsamsung galaxy ([^\s-]+)/i, brand: 'Samsung', model: 'Galaxy $1' },
    { pattern: /\bgalaxy ([^\s-]+)/i, brand: 'Samsung', model: 'Galaxy $1' },

    // Apple patterns
    { pattern: /\bapple iphone (\d+[^\s-]*)/i, brand: 'Apple', model: 'iPhone $1' },
    { pattern: /\biphone (\d+[^\s-]*)/i, brand: 'Apple', model: 'iPhone $1' },

    // Google patterns
    { pattern: /\bgoogle pixel (\d+[^\s-]*)/i, brand: 'Google', model: 'Pixel $1' },
    { pattern: /\bpixel (\d+[^\s-]*)/i, brand: 'Google', model: 'Pixel $1' },

    // OnePlus patterns
    { pattern: /\boneplus (\d+[^\s-]*)/i, brand: 'OnePlus', model: '$1' },
    { pattern: /\b(oneplus|one plus) ([^\s-]+)/i, brand: 'OnePlus', model: '$2' },

    // Xiaomi patterns
    { pattern: /\bxiaomi ([^\s-]+)/i, brand: 'Xiaomi', model: '$1' },
    { pattern: /\bmi (\d+[^\s-]*)/i, brand: 'Xiaomi', model: 'Mi $1' },
    { pattern: /\bredmi ([^\s-]+)/i, brand: 'Xiaomi', model: 'Redmi $1' },

    // Huawei patterns
    { pattern: /\bhuawei ([^\s-]+)/i, brand: 'Huawei', model: '$1' },
    { pattern: /\bmate (\d+[^\s-]*)/i, brand: 'Huawei', model: 'Mate $1' },
    { pattern: /\bp(\d+[^\s-]*)/i, brand: 'Huawei', model: 'P$1' },

    // Honor patterns
    { pattern: /\bhonor ([^\s-]+)/i, brand: 'Honor', model: '$1' },

    // Sony patterns
    { pattern: /\bsony xperia ([^\s-]+)/i, brand: 'Sony', model: 'Xperia $1' },
    { pattern: /\bxperia ([^\s-]+)/i, brand: 'Sony', model: 'Xperia $1' },

    // Asus patterns
    { pattern: /\basus ([^\s-]+)/i, brand: 'Asus', model: '$1' },
    { pattern: /\bzenfone (\d+[^\s-]*)/i, brand: 'Asus', model: 'Zenfone $1' },

    // Motorola patterns
    { pattern: /\bmotorola ([^\s-]+)/i, brand: 'Motorola', model: '$1' },
    { pattern: /\bmoto ([^\s-]+)/i, brand: 'Motorola', model: 'Moto $1' },

    // Generic patterns for other brands
    { pattern: /\b(oppo|vivo|realme|nokia|lg) ([^\s-]+)/i, brand: '$1', model: '$2' }
  ];

  // First try to extract from title only (more reliable)
  for (const { pattern, brand, model } of brandPatterns) {
    const match = title.match(pattern);
    if (match) {
      const phoneModel = model.replace('$1', match[1]).replace('$2', match[2] || '');
      const yearMatch = query.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

      // Skip if it's not in our target year range
      if (!YEARS.includes(parseInt(year))) continue;

      return {
        brand: brand.replace('$1', match[1] || ''),
        model: phoneModel,
        year: year,
        sources: [normalizeDomain(result.link)],
        query: query
      };
    }
  }

  // If no match in title, try combined title + snippet
  for (const { pattern, brand, model } of brandPatterns) {
    const match = combined.match(pattern);
    if (match) {
      const phoneModel = model.replace('$1', match[1]).replace('$2', match[2] || '');
      const yearMatch = query.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

      // Skip if it's not in our target year range
      if (!YEARS.includes(parseInt(year))) continue;

      return {
        brand: brand.replace('$1', match[1] || ''),
        model: phoneModel,
        year: year,
        sources: [normalizeDomain(result.link)],
        query: query
      };
    }
  }

  return null;
}

/**
 * Normalize phone entry into standard format
 */
function normalizePhoneEntry(phoneData) {
  // Clean and normalize brand
  const brand = phoneData.brand.toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/^(apple|google|samsung|oneplus|xiaomi|huawei|honor|sony|asus|motorola)$/, match => {
      // Capitalize first letter of major brands
      return match.charAt(0).toUpperCase() + match.slice(1);
    });

  // Clean and normalize model
  const model = phoneData.model
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Generate consistent ID
  const id = `${brand.toLowerCase().replace(/\s+/g, '_')}_${model.toLowerCase().replace(/\s+/g, '_')}`;

  return {
    id: id,
    brand: brand,
    name: model,
    year: phoneData.year,
    source_count: phoneData.sources.length,
    queries: [phoneData.query]
  };
}



/**
 * Update phones.json with auto-discovered phones
 */
async function updatePhonesList(newPhones) {
  const existingPhones = await safeReadJson(PHONES_PATH, []);
  const existingIds = new Set(existingPhones.map(p => p.id));

  // Backup original file
  const backupPath = `${PHONES_PATH}.backup.${Date.now()}`;
  await safeWriteJson(backupPath, existingPhones);
  console.log(`💾 Created backup: ${backupPath}`);

  // Add new phones (avoid duplicates)
  const added = [];
  const duplicates = [];

  for (const phone of newPhones) {
    if (existingIds.has(phone.id)) {
      duplicates.push(phone);
    } else {
      existingPhones.push(phone);
      added.push(phone);
      existingIds.add(phone.id);
    }
  }

  // Save updated list
  await safeWriteJson(PHONES_PATH, existingPhones);

  console.log(`📦 Updated ${PHONES_PATH}:`);
  console.log(`   ➕ Added: ${added.length} phones`);
  console.log(`   🚫 Duplicates: ${duplicates.length} phones`);

  if (added.length > 0) {
    console.log(`   ✅ New phones added:`);
    added.forEach(phone => {
      console.log(`      - ${phone.brand} ${phone.name} (${phone.source_count} sources)`);
    });
  }

  return { added: added.length, duplicates: duplicates.length, total: existingPhones.length };
}



/** Enhanced price extraction with multiple strategies and validation **/
async function extractPriceFromRetailResult(result) {
  const domain = normalizeDomain(result.link);
  const startTime = Date.now();

  console.log(`💰 Extracting price from ${domain}...`);

  // Strategy 1: Check pagemap for structured offers
  try {
    if (result.pagemap?.offer?.[0]?.price) {
      const offer = result.pagemap.offer[0];
      const price = parseFloat(offer.price);
      if (price > 0) {
        console.log(`💰 Found price in pagemap: $${price}`);
        return {
          price: price,
          currency: offer.priceCurrency || 'USD',
          source: 'pagemap-offer',
          domain: domain,
          extraction_time: Date.now() - startTime
        };
      }
    }
  } catch (error) {
    console.warn(`⚠️ Error parsing pagemap offer: ${error.message}`);
  }

  // Strategy 2: Fetch page and extract structured data
  try {
    const html = await fetchHtml(result.link);
    if (html) {
      // Try JSON-LD extraction
      const structuredPrice = extractPriceFromHtml(html, result.link);
      if (structuredPrice) {
        console.log(`💰 Found structured price: $${structuredPrice.price} (${structuredPrice.source})`);
        return {
          ...structuredPrice,
          extraction_time: Date.now() - startTime
        };
      }
    }
  } catch (error) {
    console.warn(`⚠️ Error fetching HTML for price extraction: ${error.message}`);
  }

  // Strategy 3: Enhanced snippet price extraction
  const snippetPriceValue = snippetPrice(result.snippet);
  if (snippetPriceValue) {
    console.log(`💰 Found snippet price: $${snippetPriceValue}`);
    return {
      price: snippetPriceValue,
      currency: 'USD',
      source: 'snippet-regex',
      domain: domain,
      extraction_time: Date.now() - startTime
    };
  }

  console.log(`💰 No price found for ${domain}`);
  return null;
}

/** compute consensus median price */
function computePriceConsensus(priceEntries) {
  const vals = priceEntries.filter(Boolean).map(p => p.price);
  if (!vals.length) return null;
  vals.sort((a, b) => a - b);
  const mid = Math.floor(vals.length / 2);
  const median = vals.length % 2 === 1 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  const deviation = Math.max(...vals) - Math.min(...vals);
  const consistency = median > 0 ? Math.max(0, 1 - (deviation / median)) : 0;
  return { median, consistency, count: vals.length };
}

/** build fingerprint for a phone entry */
function buildFingerprint(entry) {
  const raw = JSON.stringify({
    id: entry.id,
    name: entry.name,
    urls: entry.urls || {},
    price_median: entry.price?.median || null,
    image_src: entry.image?.src || null
  });
  return sha256Hex(raw);
}

/** Enhanced phone discovery with comprehensive data collection and metrics tracking **/
async function discoverPhone(phone, metrics = null) {
  const startTime = Date.now();
  console.log(`📱 Discovering phone: ${phone.brand} ${phone.name} (ID: ${phone.id})`);

  const queries = [
    `${phone.brand} ${phone.name} specs site:gsmarena.com`,
    `${phone.brand} ${phone.name} official site:samsung.com OR site:apple.com OR site:gsmarena.com`,
    `${phone.brand} ${phone.name} price site:amazon.com OR site:bestbuy.com`
  ];

  const collected = {
    id: phone.id,
    brand: phone.brand,
    name: phone.name,
    urls: {},
    image: null,
    price: null,
    meta: {
      discovered_at: new Date().toISOString(),
      source_count: 0,
      trust_score: 0.8,
      discovery_time_ms: 0,
      queries_executed: 0,
      data_sources: []
    }
  };

  try {
    // Process queries with enhanced error tracking
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`📱 Query ${i + 1}/${queries.length}: ${query}`);

      try {
        const results = await fetchCse(query);
        collected.meta.queries_executed++;

        if (!results || results.length === 0) {
          console.log(`📱 No results for query`);
          continue;
        }

        console.log(`📱 Got ${results.length} results`);

        // Process results with enhanced data extraction
        for (const result of results.slice(0, CONFIG.MAX_IMAGE_CANDIDATES)) {
          const domain = normalizeDomain(result.link);

          try {
            // Look for specs
            if (query.includes('specs') && !collected.urls.specs) {
              collected.urls.specs = result.link;
              collected.meta.data_sources.push({
                type: 'specs',
                url: result.link,
                domain: domain,
                method: 'cse_result'
              });
              console.log(`📱 Found specs: ${result.link}`);
            }

            // Look for image
            if (query.includes('official') && !collected.image) {
              const image = await chooseOfficialImageFromResults([result], phone.name, true);
              if (image) {
                collected.image = image;
                collected.meta.data_sources.push({
                  type: 'image',
                  url: image.src,
                  domain: image.domain,
                  trust_score: image.trust,
                  method: 'cse_pagemap'
                });
                if (metrics) metrics.images_found++;
                console.log(`📱 Found image: ${image.src.substring(0, 50)}...`);
              }
            }

            // Look for price
            if (query.includes('price') && !collected.price) {
              const price = await extractPriceFromRetailResult(result);
              if (price) {
                collected.price = price;
                collected.meta.data_sources.push({
                  type: 'price',
                  value: price.price,
                  currency: price.currency,
                  domain: price.domain,
                  method: price.source
                });
                if (metrics) metrics.prices_found++;
                console.log(`📱 Found price: $${price.price} (${price.source})`);
              }
            }
          } catch (resultError) {
            console.warn(`⚠️ Error processing result from ${domain}: ${resultError.message}`);
            if (metrics) metrics.processing_errors++;
          }
        }
      } catch (queryError) {
        console.warn(`⚠️ Query failed: ${queryError.message}`);
        if (metrics) metrics.api_errors++;
      }
    }

    // Calculate enhanced metadata
    collected.meta.source_count = Object.keys(collected.urls).length + (collected.image ? 1 : 0) + (collected.price ? 1 : 0);
    collected.meta.trust_score = calculateTrustScore(collected);
    collected.meta.discovery_time_ms = Date.now() - startTime;
    collected.meta.fingerprint = buildFingerprint(collected);

    console.log(`📱 Discovery complete for ${phone.name}:`);
    console.log(`   • Sources: ${collected.meta.source_count}`);
    console.log(`   • Trust Score: ${collected.meta.trust_score.toFixed(2)}`);
    console.log(`   • Time: ${collected.meta.discovery_time_ms}ms`);

    return collected;

  } catch (error) {
    console.error(`📱 Discovery failed for ${phone.name}: ${error.message}`);
    if (metrics) metrics.processing_errors++;
    throw error;
  }
}

/** Calculate trust score based on data sources and quality **/
function calculateTrustScore(phone) {
  let trustScore = 0.5; // Base trust score

  // Factor in source count
  trustScore += Math.min(phone.meta.source_count * 0.1, 0.3);

  // Factor in data completeness
  if (phone.urls.specs) trustScore += 0.2;
  if (phone.image && phone.image.src) trustScore += 0.2;
  if (phone.price) trustScore += 0.1;

  // Factor in domain trust scores
  if (phone.image && phone.image.domain) {
    trustScore += (TRUST_SCORES[phone.image.domain] || 0.5) * 0.1;
  }

  return Math.min(trustScore, 1.0);
}

/** Enhanced main execution with comprehensive monitoring and error recovery **/
async function run() {
  const startTime = Date.now();
  const runId = `discovery_${Date.now()}`;

  console.log(`🚀 Starting SmartMatch Discovery v3.1...`);
  console.log(`📊 Run ID: ${runId}`);
  console.log(`📱 Mode: Auto-Discovery (Simplified)`);
  console.log(`🔧 Configuration:`);
  console.log(`   • Batch Limit: ${CONFIG.BATCH_LIMIT}`);
  console.log(`   • Concurrency: ${CONFIG.CONCURRENCY_LIMIT}`);
  console.log(`   • Cache TTL: ${CONFIG.CSE_CACHE_TTL / 1000}s`);
  console.log(`   • Source Threshold: ${CONFIG.AUTO_DISCOVERY_SOURCES_THRESHOLD}`);
  console.log(`   • Max Discovery: ${CONFIG.MAX_AUTO_DISCOVERY_PHONES}`);
  console.log(`   • Blacklist: ${CONFIG.ENABLE_BLACKLIST ? 'Enabled' : 'Disabled'}`);
  console.log(`   • Caching: ${CONFIG.ENABLE_CACHING ? 'Enabled' : 'Disabled'}`);

  // Initialize metrics tracking
  const metrics = {
    run_id: runId,
    start_time: new Date().toISOString(),
    phase: 'discovery',
    queries_executed: 0,
    results_found: 0,
    phones_discovered: 0,
    images_found: 0,
    prices_found: 0,
    blacklisted_images_skipped: 0,
    cache_hits: 0,
    cache_misses: 0,
    api_errors: 0,
    network_errors: 0,
    processing_errors: 0,
    total_duration_ms: 0
  };

  try {
    // Ensure required directories exist
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(CACHE_DIR, { recursive: true });

    // Load existing blacklist for metrics
    if (CONFIG.ENABLE_BLACKLIST) {
      const blacklist = await loadImageBlacklist();
      metrics.initial_blacklist_size = blacklist.rejected.length;
      console.log(`📋 Loaded blacklist with ${blacklist.rejected.length} entries`);
    }

    // Execute auto-discovery (simplified single mode)
    console.log(`🔍 Running auto-discovery mode...`);
    await runAutoDiscovery(metrics);

    // Calculate final metrics
    metrics.total_duration_ms = Date.now() - startTime;
    metrics.end_time = new Date().toISOString();

    // Export comprehensive metrics for telemetry
    const telemetryMetrics = {
      ...metrics,
      success_rate: metrics.api_errors === 0 ? 1.0 : Math.max(0, 1 - (metrics.api_errors / metrics.queries_executed)),
      avg_query_time_ms: metrics.queries_executed > 0 ? metrics.total_duration_ms / metrics.queries_executed : 0,
      cache_hit_rate: (metrics.cache_hits + metrics.cache_misses) > 0 ? metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses) : 0,
      data_quality_score: calculateDataQualityScore(metrics)
    };

    // Set environment variable for telemetry
    process.env.PIPELINE_METRICS = JSON.stringify(telemetryMetrics);

    console.log(`✅ Discovery completed successfully!`);
    console.log(`📊 Final Metrics:`);
    console.log(`   • Duration: ${Math.round(metrics.total_duration_ms / 1000)}s`);
    console.log(`   • Queries: ${metrics.queries_executed}`);
    console.log(`   • Results: ${metrics.results_found}`);
    console.log(`   • Phones: ${metrics.phones_discovered}`);
    console.log(`   • Images: ${metrics.images_found}`);
    console.log(`   • Prices: ${metrics.prices_found}`);
    console.log(`   • Cache Hit Rate: ${Math.round(telemetryMetrics.cache_hit_rate * 100)}%`);
    console.log(`   • Errors: ${metrics.api_errors + metrics.network_errors + metrics.processing_errors}`);

  } catch (error) {
    metrics.total_duration_ms = Date.now() - startTime;
    metrics.error = error.message;
    metrics.error_stack = error.stack;

    console.error(`❌ Discovery failed:`, error);

    // Export error metrics
    process.env.PIPELINE_METRICS = JSON.stringify({
      ...metrics,
      phase: 'discovery_error',
      success_rate: 0,
      error: error.message
    });

    throw error;
  }
}

/** Calculate overall data quality score **/
function calculateDataQualityScore(metrics) {
  const factors = {
    cache_efficiency: metrics.cache_hit_rate,
    error_rate: metrics.api_errors / Math.max(metrics.queries_executed, 1),
    data_completeness: metrics.images_found / Math.max(metrics.phones_discovered, 1),
    processing_success: 1 - (metrics.processing_errors / Math.max(metrics.phones_discovered, 1))
  };

  return (
    factors.cache_efficiency * 0.2 +
    (1 - factors.error_rate) * 0.3 +
    Math.min(factors.data_completeness, 1) * 0.3 +
    factors.processing_success * 0.2
  );
}

/** Enhanced auto-discovery mode with comprehensive metrics tracking **/
async function runAutoDiscovery(metrics) {
  console.log("🔍 SmartMatch auto-discovery starting...");

  try {
    // Step 1: Discover new phones using CSE
    const newPhones = await autoDiscoverPhones(metrics);

    if (newPhones.length === 0) {
      console.log("📦 No new phones discovered.");
      return;
    }

    // Step 2: Update phones.json with new discoveries
    const updateResult = await updatePhonesList(newPhones);

    // Export simplified metrics for telemetry
    const discoveryMetrics = {
      phase: 'auto_discovery',
      phones_discovered: newPhones.length,
      phones_added: updateResult.added,
      phones_duplicates: updateResult.duplicates,
      queries_available: generateRollingQueries().length,
      queries_per_run: CONFIG.QUERIES_PER_RUN,
      source_threshold: CONFIG.AUTO_DISCOVERY_SOURCES_THRESHOLD,
      year_range: YEARS.join('-'),
      duration_s: Math.round((Date.now() - metrics.start_time) / 1000),
      success_rate: 1.0,
      data_integrity_score: 1.0,
      avg_latency_ms: 0
    };

    process.env.PIPELINE_METRICS = JSON.stringify(discoveryMetrics);

  } catch (error) {
    console.error("❌ Auto-discovery failed:", error.message);
    throw error;
  }
}

/** Enhanced auto-discovery with metrics tracking **/
async function autoDiscoverPhones(metrics) {
  console.log("🔍 Rolling auto-discovery: 2023-2025 smartphones...");

  const allQueries = generateRollingQueries();
  const phoneCandidates = new Map();

  // Load query rotation state
  const queryStatePath = path.join(DATA_DIR, "query-rotation.json");
  let queryState = await safeReadJson(queryStatePath, { lastQueryIndex: 0 });

  // Select only 1 query for this run (rotating through all queries)
  const currentQueryIndex = queryState.lastQueryIndex % allQueries.length;
  const queryToRun = allQueries[currentQueryIndex];

  console.log(`📦 Executing query ${currentQueryIndex + 1}/${allQueries.length}: ${queryToRun}`);
  console.log(`   🔄 Query rotation: ${currentQueryIndex + 1} of ${allQueries.length} templates`);

  try {
    const results = await fetchCse(queryToRun);
    if (results && results.length > 0) {
      console.log(`   ✅ Found ${results.length} results`);

      // Parse phones from results
      for (const result of results.slice(0, CONFIG.MAX_RESULTS_PER_QUERY)) {
        const phoneData = parsePhoneFromResult(result, queryToRun);
        if (phoneData) {
          const normalized = normalizePhoneEntry(phoneData);
          const key = normalized.id;

          if (phoneCandidates.has(key)) {
            // Update existing entry with additional sources
            const existing = phoneCandidates.get(key);
            existing.sources.push(...phoneData.sources);
            existing.source_count = new Set(existing.sources).size;
            existing.queries.push(queryToRun);
          } else {
            // Add new entry
            phoneCandidates.set(key, {
              ...normalized,
              sources: [...new Set(phoneData.sources)]
            });
          }
        }
      }
    } else {
      console.log(`   ⚠️ No results found`);
    }
  } catch (error) {
    console.warn(`   ❌ Query failed: ${error.message}`);
  }

  // Update query rotation state for next run
  queryState.lastQueryIndex = (currentQueryIndex + 1) % allQueries.length;
  await safeWriteJson(queryStatePath, queryState);

  console.log(`📊 Query rotation updated: Next run will use query ${queryState.lastQueryIndex + 1}/${allQueries.length}`);

  // Filter by auto-discovery threshold (lower requirement for initial discovery)
  const qualityPhones = Array.from(phoneCandidates.values())
    .filter(phone => phone.source_count >= CONFIG.AUTO_DISCOVERY_SOURCES_THRESHOLD)
    .sort((a, b) => b.source_count - a.source_count)
    .slice(0, CONFIG.MAX_AUTO_DISCOVERY_PHONES);

  console.log(`📊 Auto-discovery complete:`);
  console.log(`   📱 Total candidates found: ${phoneCandidates.size}`);
  console.log(`   ✅ Quality phones (≥${CONFIG.AUTO_DISCOVERY_SOURCES_THRESHOLD} sources): ${qualityPhones.length}`);
  console.log(`   🚫 Filtered out: ${phoneCandidates.size - qualityPhones.length}`);

  return qualityPhones;
}

/** Enhanced normal discovery mode with comprehensive metrics tracking **/
async function runNormalDiscovery(metrics) {
  console.log("🔍 SmartMatch fresh web discovery starting...");

  try {
    const existingProcessReview = await safeReadJson(PROCESS_REVIEW_PATH, []);
    const fingerprints = await safeReadJson(FINGERPRINTS_PATH, {});

    console.log(`📱 Existing process-review has ${existingProcessReview.length} entries`);
    console.log(`📱 Starting fresh discovery from the web...`);

    // Generate queries for current year smartphones
    const currentYear = CURRENT_YEAR;
    const queries = [
      `"${currentYear} smartphones site:gsmarena.com"`,
      `"${currentYear} smartphone releases site:notebookcheck.net"`,
      `"recent phone launches ${currentYear} site:phonearena.com"`,
      `"new smartphones ${currentYear} site:amazon.com OR site:bestbuy.com"`
    ];

    const phoneCandidates = new Map();
    const discoveryStartTime = Date.now();

    // Execute queries with enhanced error tracking
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`🔍 Executing query ${i + 1}/${queries.length}: ${query}`);

      try {
        metrics.queries_executed++;

        const results = await fetchCse(query);
        if (results && results.length > 0) {
          metrics.results_found += results.length;
          console.log(`   ✅ Found ${results.length} results`);

          // Parse phones from results with enhanced tracking
          for (const result of results.slice(0, CONFIG.MAX_RESULTS_PER_QUERY)) {
            try {
              const phoneData = parsePhoneFromResult(result, query);
              if (phoneData) {
                const normalized = normalizePhoneEntry(phoneData);
                const key = normalized.id;

                if (phoneCandidates.has(key)) {
                  // Update existing entry with additional sources
                  const existing = phoneCandidates.get(key);
                  existing.sources.push(...phoneData.sources);
                  existing.source_count = new Set(existing.sources).size;
                  existing.queries.push(query);
                } else {
                  // Add new entry
                  phoneCandidates.set(key, {
                    ...normalized,
                    sources: [...new Set(phoneData.sources)]
                  });
                }
              }
            } catch (parseError) {
              console.warn(`⚠️ Error parsing result: ${parseError.message}`);
              metrics.processing_errors++;
            }
          }
        } else {
          console.log(`   ⚠️ No results found`);
        }
      } catch (error) {
        console.warn(`   ❌ Query failed: ${error.message}`);
        metrics.api_errors++;
      }

      // Rate limiting between queries
      if (i < queries.length - 1) {
        await sleep(CONFIG.QUERY_DELAY_MS);
      }
    }

    // Filter by quality threshold and convert to array
    const qualityPhones = Array.from(phoneCandidates.values())
      .filter(phone => phone.source_count >= CONFIG.MIN_SOURCES_THRESHOLD)
      .sort((a, b) => b.source_count - a.source_count)
      .slice(0, CONFIG.MAX_AUTO_DISCOVERY_PHONES);

    console.log(`📊 Fresh discovery complete:`);
    console.log(`   📱 Total candidates found: ${phoneCandidates.size}`);
    console.log(`   ✅ Quality phones (≥${CONFIG.MIN_SOURCES_THRESHOLD} sources): ${qualityPhones.length}`);

    // Convert to discovery format with enhanced error tracking
    const results = [];
    for (const phone of qualityPhones) {
      try {
        console.log(`📱 Processing ${phone.brand} ${phone.name}...`);
        const discovered = await discoverPhone(phone, metrics);
        results.push(discovered);
        metrics.phones_discovered++;
      } catch (error) {
        console.error(`📱 Discover error for ${phone.name}: ${error.message}`);
        metrics.processing_errors++;
      }
    }

    console.log(`📱 Discovery tasks completed. Got ${results.length} valid results`);

    // Merge with existing process-review with enhanced tracking
    const merged = [...existingProcessReview];
    for (const result of results) {
      const existingIndex = merged.findIndex(p => p.id === result.id);
      if (existingIndex === -1) {
        console.log(`📱 Adding new phone to process-review: ${result.name}`);
        merged.push(result);
        fingerprints[result.id] = result.meta.fingerprint;
      } else {
        if (fingerprints[result.id] !== result.meta.fingerprint) {
          console.log(`📱 Updating existing phone in process-review: ${result.name}`);
          merged[existingIndex] = result;
          fingerprints[result.id] = result.meta.fingerprint;
        } else {
          console.log(`📱 Keeping existing entry for ${result.name} (unchanged)`);
        }
      }
    }

    // Write files with error handling
    console.log(`📱 Writing ${merged.length} phones to ${PROCESS_REVIEW_PATH}...`);
    await safeWriteJson(PROCESS_REVIEW_PATH, merged);
    await safeWriteJson(FINGERPRINTS_PATH, fingerprints);

    // Enhanced metrics calculation
    const cache = await loadCseCache();
    const cacheSize = Object.keys(cache.items || {}).length;

    const finalMetrics = {
      phase: 'discovery',
      phones_processed: merged.length,
      phones_discovered: results.length,
      images_found: merged.filter(p => p.image && p.image.src).length,
      prices_found: merged.filter(p => p.price).length,
      blacklisted_images_skipped: metrics.blacklisted_images_skipped,
      qwen_verifications_used: 0, // Qwen Vision handled in enrichment phase
      price_sources: merged.reduce((sum, p) => sum + (p.price ? 1 : 0), 0),
      trust_scores: merged.map(p => p.meta?.trust_score || 0),
      avg_trust_score: merged.length > 0 ? merged.reduce((sum, p) => sum + (p.meta?.trust_score || 0), 0) / merged.length : 0,
      cache_size: cacheSize,
      cache_hit_rate: (metrics.cache_hits + metrics.cache_misses) > 0 ? metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses) : 0,
      duration_s: Math.round((Date.now() - discoveryStartTime) / 1000),
      api_errors: metrics.api_errors,
      network_errors: metrics.network_errors,
      processing_errors: metrics.processing_errors,
      success_rate: metrics.api_errors === 0 ? 1.0 : Math.max(0, 1 - (metrics.api_errors / metrics.queries_executed)),
      data_integrity_score: calculateDataQualityScore({
        cache_hit_rate: (metrics.cache_hits + metrics.cache_misses) > 0 ? metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses) : 0,
        api_errors: metrics.api_errors,
        phones_discovered: results.length,
        images_found: merged.filter(p => p.image && p.image.src).length,
        processing_errors: metrics.processing_errors
      }),
      avg_latency_ms: metrics.queries_executed > 0 ? (Date.now() - discoveryStartTime) / metrics.queries_executed : 0
    };

    console.log(`📦 Discovery complete. Saved ${merged.length} phones to ${PROCESS_REVIEW_PATH}`);
    console.log(`📊 Cache size: ${cacheSize} entries`);

    // Set environment variable for telemetry
    process.env.PIPELINE_METRICS = JSON.stringify(finalMetrics);

  } catch (error) {
    console.error("❌ Normal discovery failed:", error.message);
    throw error;
  }
}

export { run };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
