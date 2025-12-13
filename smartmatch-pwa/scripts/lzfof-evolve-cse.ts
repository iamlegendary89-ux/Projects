#!/usr/bin/env npx tsx
// @ts-nocheck - Test utility file
/**
 * LZFOF Evolution: CSE Query Generation
 * 
 * Tests different query generation strategies to find the optimal balance between:
 * 1. API call efficiency (fewer queries)
 * 2. Search result quality (hit rate)
 * 3. Precision (avoid wrong phone models)
 */

import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config({ path: ".env.local" });

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_PHONES = [
  { brand: "Apple", model: "iPhone 15 Pro" },
  { brand: "Samsung", model: "Galaxy S25 Ultra" },
  { brand: "Google", model: "Pixel 9 Pro" },
  { brand: "OnePlus", model: "13" },
  { brand: "Xiaomi", model: "14 Ultra" },
];

const SOURCE_TYPES = [
  "gsmarena_specs",
  "gsmarena_review",
  "phonearena_review",
  "theverge_review",
];

// ============================================================================
// VARIANT STRATEGIES
// ============================================================================

type QueryGenerator = (brand: string, model: string, fullName: string, sourceType: string) => string[];

// V0: Original (current implementation)
const V0_ORIGINAL: QueryGenerator = (brand, model, fullName, sourceType) => {
  const QUERY_GENS: Record<string, (b: string, m: string, f: string) => string[]> = {
    gsmarena_specs: (_b, _m, f) => [`site:gsmarena.com ${f} specs -forum`],
    gsmarena_review: (_b, _m, f) => [`site:gsmarena.com ${f} review -forum`],
    phonearena_review: (_b, _m, f) => [`site:phonearena.com ${f} review`],
    dxomark_review: (b, m, _f) => [`site:dxomark.com ${b} ${m}`],
    theverge_review: (_b, _m, f) => [`site:theverge.com ${f} review`],
    androidcentral_review: (_b, _m, f) => [`site:androidcentral.com ${f} review`],
    androidauthority_review: (_b, _m, f) => [`site:androidauthority.com ${f} review`],
    tomsguide_review: (_b, _m, f) => [`site:tomsguide.com ${f} review`],
    techradar_review: (_b, _m, f) => [`site:techradar.com ${f} review`],
    notebookcheck_review: (_b, _m, f) => [`site:notebookcheck.net ${f} review`],
  };

  const gen = QUERY_GENS[sourceType];
  return gen ? gen(brand, model, fullName) : [`${fullName} ${sourceType.replace(/_/g, " ")} review`];
};

// V1: Quoted exact match - Higher precision
const V1_QUOTED: QueryGenerator = (_brand, _model, fullName, sourceType) => {
  const site = getSite(sourceType);
  const suffix = sourceType.includes("specs") ? "specs" : "review";
  return [`site:${site} "${fullName}" ${suffix}`];
};

// V2: Multiple fallback queries - Higher recall
const V2_FALLBACKS: QueryGenerator = (brand, model, fullName, sourceType) => {
  const site = getSite(sourceType);
  const suffix = sourceType.includes("specs") ? "specs" : "review";
  return [
    `site:${site} "${fullName}" ${suffix}`,
    `site:${site} ${fullName} ${suffix}`,
    `site:${site} ${model} ${brand} ${suffix}`,
  ];
};

// V3: Intitle for precision
const V3_INTITLE: QueryGenerator = (brand, model, _fullName, sourceType) => {
  const site = getSite(sourceType);
  const suffix = sourceType.includes("specs") ? "specs" : "review";
  return [`site:${site} intitle:"${model}" ${brand} ${suffix}`];
};

// V4: Hybrid - Quoted with exclusions
const V4_HYBRID: QueryGenerator = (_brand, model, fullName, sourceType) => {
  const site = getSite(sourceType);
  const suffix = sourceType.includes("specs") ? "specs" : "review";
  const exclusions = getExclusions(model);
  const excStr = exclusions.map(ex => `-"${ex}"`).join(" ");
  return [`site:${site} "${fullName}" ${suffix} ${excStr}`.trim()];
};

// V5: Optimized for 2024+ models
const V5_MODERN: QueryGenerator = (_brand, _model, fullName, sourceType) => {
  const site = getSite(sourceType);
  const suffix = sourceType.includes("specs") ? "specifications" : "review";
  const year = new Date().getFullYear();
  return [
    `site:${site} "${fullName}" ${suffix} ${year}`,
    `site:${site} "${fullName}" ${suffix}`,
  ];
};

// Helper: Get site from source type
function getSite(sourceType: string): string {
  const sites: Record<string, string> = {
    gsmarena_specs: "gsmarena.com",
    gsmarena_review: "gsmarena.com",
    phonearena_review: "phonearena.com",
    dxomark_review: "dxomark.com",
    theverge_review: "theverge.com",
    androidcentral_review: "androidcentral.com",
    androidauthority_review: "androidauthority.com",
    tomsguide_review: "tomsguide.com",
    techradar_review: "techradar.com",
    notebookcheck_review: "notebookcheck.net",
  };
  return sites[sourceType] || "google.com";
}

// Helper: Get variant exclusions
function getExclusions(model: string): string[] {
  const exclusions: Record<string, string[]> = {
    "iphone 15 pro": ["Pro Max"],
    "galaxy s25 ultra": ["S25+", "S25 Plus"],
    "pixel 9 pro": ["Pro XL", "Pro Fold"],
  };
  return exclusions[model.toLowerCase()] || [];
}

// ============================================================================
// CSE API TEST
// ============================================================================

interface CSEResult {
  title: string;
  link: string;
  snippet: string;
}

async function searchCSE(query: string): Promise<CSEResult[]> {
  const apiKey = process.env["CUSTOM_SEARCH_API_KEY"];
  const cseId = process.env["SEARCH_ENGINE_ID"];

  if (!apiKey || !cseId) {
    console.warn("⚠️ CSE credentials not set - using mock results");
    return [];
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=3`;
    const res = await axios.get(url, { timeout: 10000 });

    if (res.data.items) {
      return res.data.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      }));
    }
    return [];
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.warn("⚠️ Rate limited - waiting 2s");
      await new Promise(r => setTimeout(r, 2000));
      return [];
    }
    console.error(`CSE Error: ${error.message}`);
    return [];
  }
}

// ============================================================================
// SCORING
// ============================================================================

function scoreResult(result: CSEResult, brand: string, model: string): number {
  let score = 0;
  const titleLower = result.title.toLowerCase();
  const linkLower = result.link.toLowerCase();
  const brandLower = brand.toLowerCase();
  const modelLower = model.toLowerCase();

  // Title contains brand
  if (titleLower.includes(brandLower)) { score += 2; }

  // Title contains model
  if (titleLower.includes(modelLower)) { score += 3; }

  // URL contains model keywords
  const modelParts = modelLower.split(/\s+/);
  for (const part of modelParts) {
    if (part.length > 2 && linkLower.includes(part)) { score += 1; }
  }

  // Penalty for wrong variant
  if (titleLower.includes("pro max") && !modelLower.includes("pro max")) { score -= 5; }
  if (titleLower.includes("ultra") && !modelLower.includes("ultra")) { score -= 5; }
  if (titleLower.includes("plus") && !modelLower.includes("plus")) { score -= 5; }

  return score;
}

// ============================================================================
// EVOLUTION RUN
// ============================================================================

interface VariantResult {
  name: string;
  totalQueries: number;
  totalResults: number;
  avgScore: number;
  hitRate: number;
  samples: Array<{ phone: string; query: string; resultCount: number; topScore: number }>;
}

const VARIANTS: Record<string, QueryGenerator> = {
  "V0-Original": V0_ORIGINAL,
  "V1-Quoted": V1_QUOTED,
  "V2-Fallbacks": V2_FALLBACKS,
  "V3-Intitle": V3_INTITLE,
  "V4-Hybrid": V4_HYBRID,
  "V5-Modern": V5_MODERN,
};

async function runEvolution(): Promise<void> {
  console.log("🧬 LZFOF Evolution: CSE Query Generation");
  console.log("═".repeat(60));
  console.log(`Testing ${Object.keys(VARIANTS).length} variants across ${TEST_PHONES.length} phones\n`);

  const results: VariantResult[] = [];

  for (const [name, generator] of Object.entries(VARIANTS)) {
    console.log(`\n📊 Testing ${name}...`);

    const variantResult: VariantResult = {
      name,
      totalQueries: 0,
      totalResults: 0,
      avgScore: 0,
      hitRate: 0,
      samples: [],
    };

    let totalScore = 0;
    let scoredResults = 0;

    for (const phone of TEST_PHONES) {
      const fullName = `${phone.brand} ${phone.model}`;

      // Test only first 2 source types to save API quota
      for (const sourceType of SOURCE_TYPES.slice(0, 2)) {
        const queries = generator(phone.brand, phone.model, fullName, sourceType);

        for (const query of queries.slice(0, 1)) { // Only test first query
          variantResult.totalQueries++;

          const searchResults = await searchCSE(query);
          variantResult.totalResults += searchResults.length;

          let topScore = 0;
          for (const result of searchResults) {
            const score = scoreResult(result, phone.brand, phone.model);
            topScore = Math.max(topScore, score);
            totalScore += score;
            scoredResults++;
          }

          variantResult.samples.push({
            phone: fullName,
            query: query.substring(0, 60),
            resultCount: searchResults.length,
            topScore,
          });

          // Rate limiting
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }

    variantResult.avgScore = scoredResults > 0 ? totalScore / scoredResults : 0;
    variantResult.hitRate = variantResult.totalQueries > 0
      ? (variantResult.samples.filter(s => s.resultCount > 0).length / variantResult.totalQueries) * 100
      : 0;

    results.push(variantResult);

    console.log(`   Queries: ${variantResult.totalQueries}`);
    console.log(`   Hit Rate: ${variantResult.hitRate.toFixed(1)}%`);
    console.log(`   Avg Score: ${variantResult.avgScore.toFixed(2)}`);
  }

  // ============================================================================
  // RESULTS
  // ============================================================================

  console.log("\n" + "═".repeat(60));
  console.log("📊 EVOLUTION RESULTS");
  console.log("═".repeat(60));

  // Sort by combined score (hitRate * avgScore)
  results.sort((a, b) => {
    const scoreA = a.hitRate * a.avgScore;
    const scoreB = b.hitRate * b.avgScore;
    return scoreB - scoreA;
  });

  console.log("\n| Rank | Variant | Hit Rate | Avg Score | Combined |");
  console.log("|------|---------|----------|-----------|----------|");

  results.forEach((r, i) => {
    const combined = (r.hitRate * r.avgScore).toFixed(1);
    const marker = i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
    console.log(`| ${marker} ${i + 1} | ${r.name.padEnd(12)} | ${r.hitRate.toFixed(1).padStart(7)}% | ${r.avgScore.toFixed(2).padStart(9)} | ${combined.padStart(8)} |`);
  });

  // Winner analysis
  const winner = results[0];
  if (winner) {
    console.log(`\n🏆 WINNER: ${winner.name}`);
    console.log(`   - Hit Rate: ${winner.hitRate.toFixed(1)}%`);
    console.log(`   - Avg Score: ${winner.avgScore.toFixed(2)}`);
    console.log(`   - Total Queries Generated: ${winner.totalQueries}`);

    console.log("\n📝 Sample Queries:");
    winner.samples.slice(0, 5).forEach(s => {
      console.log(`   [${s.phone}] "${s.query}..." → ${s.resultCount} results (score: ${s.topScore})`);
    });
  }

  // Save results
  const outputPath = `data/lzfof_tests/cse_evolution_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)}.json`;
  const fs = await import("fs/promises");
  await fs.mkdir("data/lzfof_tests", { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to ${outputPath}`);
}

runEvolution().catch(console.error);
