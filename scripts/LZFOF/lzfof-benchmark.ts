#!/usr/bin/env npx tsx
// @ts-nocheck - Test utility file, excluded from strict type checking
/**
 * LZFOF Optimization Benchmark
 * Measures performance of optimized functions
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Test data (prefixed with _ to suppress unused variable warnings when not using all tests)
const _TEST_URLS = [
  "https://www.gsmarena.com/samsung_galaxy_s25-review-12345.php",
  "https://www.phonearena.com/reviews/iphone-15-pro-review_id5848",
  "https://www.techradar.com/reviews/samsung-galaxy-s24-ultra",
];

const _TEST_TITLES = [
  "Samsung Galaxy S25 Review - GSMArena",
  "iPhone 15 Pro Review - PhoneArena",
  "Samsung Galaxy S24 Ultra Review - TechRadar",
];

const _TEST_HTML = `
<html>
<body>
  <td class="ttl">Released</td>
  <td class="nfo">2024, March 15</td>
  <article class="review-content">
    This is a comprehensive review of the Samsung Galaxy S25. The phone features excellent performance.
    Battery life is impressive, lasting over 12 hours of screen-on time. The camera system delivers
    outstanding results in daylight and low-light conditions. The 6.2-inch display is bright and vibrant.
    Overall, this is one of the best flagship phones of 2024, though the price might be a concern.
  </article>
</body>
</html>
`;

const _TEST_CONTENT = `
This is a comprehensive review of the Samsung Galaxy S25 smartphone.
The Samsung Galaxy S25 features the latest Snapdragon 8 Elite processor.
Camera performance is excellent with the 50MP main sensor.
Battery life reaches approximately 13-15 hours of active use.
The display is a beautiful 6.2-inch Dynamic AMOLED panel.
Software is One UI 7 based on Android 15 with 7 years of updates.
Build quality is premium with Gorilla Glass Victus 2 and titanium frame.
Overall, the Galaxy S25 offers great value for a flagship device.
`.repeat(10); // Make it longer for realistic testing

const TEST_ATTRS = [
  { score: 9.2, explanation: "Excellent camera with DXOMark 154 rating" },
  { score: 8.5, explanation: "Good battery life, 13 hours active use" },
  { score: 9.6, explanation: "Top-tier performance with Snapdragon 8 Elite" },
  { score: 9.3, explanation: "Bright 2600 nit display with 120Hz" },
  { score: 9.1, explanation: "Clean One UI with 7 years updates" },
  { score: 8.8, explanation: "Premium titanium build at 162g" },
  { score: 8.5, explanation: "Great value with 7 year support" },
];

// Benchmark runner
function benchmark(name: string, fn: () => void, iterations: number = 10000): { name: string; avgMs: number; opsPerSec: number } {
  // Warm up
  for (let i = 0; i < 100; i++) { fn(); }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) { fn(); }
  const elapsed = performance.now() - start;

  const avgMs = elapsed / iterations;
  const opsPerSec = Math.round(1000 / avgMs);

  return { name, avgMs, opsPerSec };
}

async function main() {
  console.log("🔬 LZFOF Optimization Benchmark\n");
  console.log("=".repeat(60));

  const results: { name: string; avgMs: number; opsPerSec: number }[] = [];

  // Import the optimized functions
  const { formatSourceName, normalizePath } = await import("../scripts/enrichment.js");

  // Test formatSourceName
  const filePaths = [
    "data/content/samsung_galaxy_s25/1_gsmarena_specs.txt",
    "data/content/apple_iphone_15_pro/2_gsmarena_review.txt",
    "D:\\Projects\\smartmatch-pwa\\data\\content\\samsung_galaxy_s25\\3_phonearena_review.txt",
  ];

  results.push(benchmark("formatSourceName", () => {
    for (const path of filePaths) {
      formatSourceName(path);
    }
  }, 5000));

  // Test normalizePath
  const phones = [
    { brand: "Samsung", model: "Galaxy S25" },
    { brand: "Apple", model: "iPhone 15 Pro" },
    { brand: "OnePlus", model: "13" },
  ];

  results.push(benchmark("normalizePath", () => {
    for (const p of phones) {
      normalizePath(p.brand, p.model);
    }
  }, 5000));

  // Test generateId (inline since it's not exported)
  const ID_SANITIZE_RE = /[^a-z0-9]/g;
  const generateId = (brand: string, model: string): string => {
    return `${brand.toLowerCase()}_${model.toLowerCase().replace(ID_SANITIZE_RE, "_")}`;
  };

  results.push(benchmark("generateId (optimized)", () => {
    for (const p of phones) {
      generateId(p.brand, p.model);
    }
  }, 5000));

  // Compare with non-optimized version
  const generateIdOld = (brand: string, model: string): string => {
    return `${brand.toLowerCase()}_${model.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  };

  results.push(benchmark("generateId (inline regex)", () => {
    for (const p of phones) {
      generateIdOld(p.brand, p.model);
    }
  }, 5000));

  // Test calcConfidence (recreate both versions)
  const NOT_MENTIONED_RE = /not mentioned/i;
  const calcConfidenceOptimized = (attrs: Array<{ score: number; explanation: string }>, ms: number, tokens: number, sources: number): number => {
    let complete = 0;
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i]!;
      if (a.score > 0 && !NOT_MENTIONED_RE.test(a.explanation)) { complete++; }
    }
    let c = 0.96 * (0.85 + (complete / 7) * 0.15);
    if (ms < 1000) { c *= 0.98; }
    else if (ms > 45000) { c *= 0.96; }
    if (tokens > 6250) { c *= 0.98; }
    else if (tokens < 1000) { c *= 0.97; }
    c += sources * 0.015;
    return c > 0.999 ? 0.999 : c < 0.70 ? 0.70 : c > 0.879 ? 0.879 : c;
  };

  const calcConfidenceOld = (attrs: Array<{ score: number; explanation: string }>, ms: number, tokens: number, sources: number): number => {
    let c = 0.96;
    const complete = attrs.filter(a => a.score > 0 && !a.explanation.toLowerCase().includes("not mentioned")).length;
    c *= 0.85 + (complete / 7) * 0.15;
    if (ms < 1000) { c *= 0.98; }
    else if (ms > 45000) { c *= 0.96; }
    const ratio = tokens / 2500;
    if (ratio > 2.5) { c *= 0.98; }
    else if (ratio < 0.4) { c *= 0.97; }
    c += Math.min(0.12, sources * 0.015);
    return Math.min(0.999, Math.max(0.70, c));
  };

  results.push(benchmark("calcConfidence (optimized)", () => {
    calcConfidenceOptimized(TEST_ATTRS, 5000, 2000, 8);
  }, 10000));

  results.push(benchmark("calcConfidence (old)", () => {
    calcConfidenceOld(TEST_ATTRS, 5000, 2000, 8);
  }, 10000));

  // Test categorize (recreate both versions)
  const THRESHOLDS = { FLAGSHIP: 8.2, PREMIUM: 7.4, UPPER_MID: 6.2, MIDRANGE: 4.5 };
  const CATEGORY_BANDS = [
    [8.2, "flagship"],
    [7.4, "premium"],
    [6.2, "upper_midrange"],
    [4.5, "midrange"],
  ] as const;

  const categorizeOptimized = (score: number): string => {
    for (const [threshold, category] of CATEGORY_BANDS) {
      if (score >= threshold) { return category; }
    }
    return "budget";
  };

  const categorizeOld = (score: number): string => {
    if (score >= THRESHOLDS.FLAGSHIP) { return "flagship"; }
    if (score >= THRESHOLDS.PREMIUM) { return "premium"; }
    if (score >= THRESHOLDS.UPPER_MID) { return "upper_midrange"; }
    if (score >= THRESHOLDS.MIDRANGE) { return "midrange"; }
    return "budget";
  };

  const testScores = [9.2, 7.8, 6.5, 5.0, 3.5];

  results.push(benchmark("categorize (optimized)", () => {
    for (const s of testScores) { categorizeOptimized(s); }
  }, 10000));

  results.push(benchmark("categorize (old)", () => {
    for (const s of testScores) { categorizeOld(s); }
  }, 10000));

  // Test validateUrl patterns (pre-compiled vs inline)
  const VARIANT_PATTERNS_PRECOMPILED = {
    "galaxy s25": [/\bedge\b/i, /\bfe\b/i, /\bultra\b/i, /\bplus\b/i],
  };

  const checkVariantOptimized = (title: string, model: string): boolean => {
    const patterns = VARIANT_PATTERNS_PRECOMPILED[model as keyof typeof VARIANT_PATTERNS_PRECOMPILED];
    if (!patterns) { return false; }
    for (const re of patterns) {
      if (re.test(title)) { return true; }
    }
    return false;
  };

  const checkVariantOld = (title: string, _model: string): boolean => {
    const variants = ["edge", "fe", "ultra", "plus"];
    for (const variant of variants) {
      const variantRegex = new RegExp(`\\b${variant}\\b`, "i");
      if (variantRegex.test(title)) { return true; }
    }
    return false;
  };

  const testTitle = "Samsung Galaxy S25 Ultra Review - Best Flagship of 2025";

  results.push(benchmark("validateUrl variant check (precompiled)", () => {
    checkVariantOptimized(testTitle, "galaxy s25");
  }, 10000));

  results.push(benchmark("validateUrl variant check (inline regex)", () => {
    checkVariantOld(testTitle, "galaxy s25");
  }, 10000));

  // Print results
  console.log("\n📊 BENCHMARK RESULTS\n");
  console.log("| Function | Avg Time | Ops/sec | Winner |");
  console.log("|----------|----------|---------|--------|");

  // Group by pairs for comparison
  for (let i = 0; i < results.length; i += 2) {
    const r1 = results[i]!;
    const r2 = results[i + 1];

    if (r2 && (r1.name.includes("optimized") || r2.name.includes("optimized"))) {
      const winner = r1.avgMs < r2.avgMs ? "1st" : "2nd";
      const speedup = r1.avgMs < r2.avgMs
        ? `${((r2.avgMs / r1.avgMs - 1) * 100).toFixed(0)}% faster`
        : `${((r1.avgMs / r2.avgMs - 1) * 100).toFixed(0)}% slower`;

      console.log(`| ${r1.name.padEnd(35)} | ${(r1.avgMs * 1000).toFixed(2)}µs | ${r1.opsPerSec.toLocaleString()} | ${winner === "1st" ? "✅" : ""} |`);
      console.log(`| ${r2.name.padEnd(35)} | ${(r2.avgMs * 1000).toFixed(2)}µs | ${r2.opsPerSec.toLocaleString()} | ${winner === "2nd" ? "✅" : ""} |`);
      console.log(`| **Speedup** | | | **${speedup}** |`);
      console.log("|---|---|---|---|");
    } else {
      console.log(`| ${r1.name.padEnd(35)} | ${(r1.avgMs * 1000).toFixed(2)}µs | ${r1.opsPerSec.toLocaleString()} | |`);
      if (r2) {
        console.log(`| ${r2.name.padEnd(35)} | ${(r2.avgMs * 1000).toFixed(2)}µs | ${r2.opsPerSec.toLocaleString()} | |`);
      }
    }
  }

  console.log("\n✅ Benchmark complete!");
}

main().catch(console.error);
