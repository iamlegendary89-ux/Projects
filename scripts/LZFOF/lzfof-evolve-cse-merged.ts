#!/usr/bin/env npx tsx
// @ts-nocheck - Test utility file
/**
 * LZFOF Evolution: Merged CSE Queries
 * 
 * Tests strategies to REDUCE total CSE API calls by merging queries:
 * - Current: 1 call per source type (10 sources = 10 calls per phone)
 * - Goal: Fewer calls with same or better coverage
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
];

// Valid review sources we want to find
const VALID_SOURCES = [
  "gsmarena.com",
  "phonearena.com",
  "theverge.com",
  "androidcentral.com",
  "androidauthority.com",
  "tomsguide.com",
  "techradar.com",
  "notebookcheck.net",
  "dxomark.com",
];

// ============================================================================
// STRATEGIES
// ============================================================================

type MergedQueryStrategy = (brand: string, model: string) => {
  queries: string[];
  expectedCallsPerPhone: number;
  description: string;
};

// CURRENT: Individual queries per source (baseline)
const CURRENT_INDIVIDUAL: MergedQueryStrategy = (brand, model) => {
  const fullName = `${brand} ${model}`;
  return {
    queries: [
      `site:gsmarena.com "${fullName}" specs`,
      `site:gsmarena.com "${fullName}" review`,
      `site:phonearena.com "${fullName}" review`,
      `site:theverge.com "${fullName}" review`,
      `site:androidcentral.com "${fullName}" review`,
      `site:tomsguide.com "${fullName}" review`,
      `site:techradar.com "${fullName}" review`,
    ],
    expectedCallsPerPhone: 7,
    description: "1 query per source (current approach)",
  };
};

// V1: One mega query with OR for all sources
const V1_MEGA_OR: MergedQueryStrategy = (brand, model) => {
  const fullName = `${brand} ${model}`;
  const sites = VALID_SOURCES.slice(0, 6).map(s => `site:${s}`).join(" OR ");
  return {
    queries: [
      `(${sites}) "${fullName}" review`,
    ],
    expectedCallsPerPhone: 1,
    description: "Single query with OR for 6 sites",
  };
};

// V2: Two queries - specs + reviews
const V2_SPLIT_TYPE: MergedQueryStrategy = (brand, model) => {
  const fullName = `${brand} ${model}`;
  return {
    queries: [
      `site:gsmarena.com "${fullName}" specs`,
      `(site:gsmarena.com OR site:phonearena.com OR site:theverge.com OR site:androidcentral.com OR site:tomsguide.com OR site:techradar.com) "${fullName}" review`,
    ],
    expectedCallsPerPhone: 2,
    description: "Specs (1) + Reviews merged (1) = 2 calls",
  };
};

// V3: Generic search without site restriction, filter after
const V3_GENERIC_FILTER: MergedQueryStrategy = (brand, model) => {
  const fullName = `${brand} ${model}`;
  return {
    queries: [
      `"${fullName}" smartphone review`,
      `"${fullName}" specifications`,
    ],
    expectedCallsPerPhone: 2,
    description: "Generic queries, filter results for valid sources",
  };
};

// V4: Three queries - specs, tier1 reviews, tier2 reviews
const V4_TIERED: MergedQueryStrategy = (brand, model) => {
  const fullName = `${brand} ${model}`;
  return {
    queries: [
      `site:gsmarena.com "${fullName}" specs`,
      `(site:gsmarena.com OR site:phonearena.com OR site:theverge.com) "${fullName}" review`,
      `(site:tomsguide.com OR site:techradar.com OR site:androidcentral.com) "${fullName}" review`,
    ],
    expectedCallsPerPhone: 3,
    description: "Specs (1) + Tier1 reviews (1) + Tier2 reviews (1)",
  };
};

// V5: Two queries with higher num results
const V5_FEWER_HIGHER_NUM: MergedQueryStrategy = (brand, model) => {
  const fullName = `${brand} ${model}`;
  return {
    queries: [
      `"${fullName}" review -forum`,  // Get 10 results
      `"${fullName}" specifications gsmarena`,  // Get 3 for specs
    ],
    expectedCallsPerPhone: 2,
    description: "2 broad queries with num=10",
  };
};

// ============================================================================
// CSE API
// ============================================================================

interface CSEResult {
  title: string;
  link: string;
  displayLink: string;
}

async function searchCSE(query: string, num: number = 5): Promise<CSEResult[]> {
  const apiKey = process.env["CUSTOM_SEARCH_API_KEY"];
  const cseId = process.env["SEARCH_ENGINE_ID"];

  if (!apiKey || !cseId) {
    console.warn("⚠️ CSE credentials not set");
    return [];
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=${num}`;
    const res = await axios.get(url, { timeout: 15000 });

    return (res.data.items || []).map((item: any) => ({
      title: item.title,
      link: item.link,
      displayLink: item.displayLink,
    }));
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.warn("⚠️ Rate limited");
      await new Promise(r => setTimeout(r, 3000));
    }
    return [];
  }
}

// ============================================================================
// SCORING
// ============================================================================

function countValidSources(results: CSEResult[]): number {
  const foundSources = new Set<string>();

  for (const result of results) {
    for (const source of VALID_SOURCES) {
      if (result.displayLink.includes(source) || result.link.includes(source)) {
        foundSources.add(source);
      }
    }
  }

  return foundSources.size;
}

function isRelevantResult(result: CSEResult, brand: string, model: string): boolean {
  const titleLower = result.title.toLowerCase();
  const brandLower = brand.toLowerCase();
  const modelParts = model.toLowerCase().split(/\s+/);

  // Must contain brand or model parts
  const hasBrand = titleLower.includes(brandLower);
  const hasModelPart = modelParts.some(p => p.length > 2 && titleLower.includes(p));

  return hasBrand || hasModelPart;
}

// ============================================================================
// EVOLUTION RUN
// ============================================================================

interface StrategyResult {
  name: string;
  description: string;
  totalCalls: number;
  totalValidSources: number;
  avgSourcesPerPhone: number;
  callsPerPhone: number;
  efficiency: number; // sources found per call
  samples: Array<{ phone: string; calls: number; validSources: number; sources: string[] }>;
}

const STRATEGIES: Record<string, MergedQueryStrategy> = {
  "Current-Individual": CURRENT_INDIVIDUAL,
  "V1-MegaOR": V1_MEGA_OR,
  "V2-SplitType": V2_SPLIT_TYPE,
  "V3-GenericFilter": V3_GENERIC_FILTER,
  "V4-Tiered": V4_TIERED,
  "V5-FewerHigherNum": V5_FEWER_HIGHER_NUM,
};

async function runEvolution(): Promise<void> {
  console.log("🧬 LZFOF Evolution: Merged CSE Queries");
  console.log("═".repeat(60));
  console.log("Goal: Reduce API calls while maintaining source coverage\n");

  const results: StrategyResult[] = [];

  for (const [name, strategyFn] of Object.entries(STRATEGIES)) {
    console.log(`\n📊 Testing ${name}...`);

    const result: StrategyResult = {
      name,
      description: "",
      totalCalls: 0,
      totalValidSources: 0,
      avgSourcesPerPhone: 0,
      callsPerPhone: 0,
      efficiency: 0,
      samples: [],
    };

    for (const phone of TEST_PHONES) {
      const fullName = `${phone.brand} ${phone.model}`;
      const strategy = strategyFn(phone.brand, phone.model);
      result.description = strategy.description;

      const allResults: CSEResult[] = [];
      let calls = 0;

      for (const query of strategy.queries) {
        calls++;
        result.totalCalls++;

        // Use higher num for merged queries
        const numResults = name.includes("Mega") || name.includes("Generic") || name.includes("Fewer") ? 10 : 5;
        const searchResults = await searchCSE(query, numResults);

        // Filter for relevant results
        const relevant = searchResults.filter(r => isRelevantResult(r, phone.brand, phone.model));
        allResults.push(...relevant);

        // Rate limiting
        await new Promise(r => setTimeout(r, 300));
      }

      const validSources = countValidSources(allResults);
      result.totalValidSources += validSources;

      // Get source names
      const foundSourceNames: string[] = [];
      for (const r of allResults) {
        for (const s of VALID_SOURCES) {
          if ((r.displayLink.includes(s) || r.link.includes(s)) && !foundSourceNames.includes(s)) {
            foundSourceNames.push(s);
          }
        }
      }

      result.samples.push({
        phone: fullName,
        calls,
        validSources,
        sources: foundSourceNames,
      });

      console.log(`   ${fullName}: ${calls} calls → ${validSources} sources [${foundSourceNames.join(", ")}]`);
    }

    result.avgSourcesPerPhone = result.totalValidSources / TEST_PHONES.length;
    result.callsPerPhone = result.totalCalls / TEST_PHONES.length;
    result.efficiency = result.totalCalls > 0 ? result.totalValidSources / result.totalCalls : 0;

    results.push(result);
  }

  // ============================================================================
  // RESULTS
  // ============================================================================

  console.log("\n" + "═".repeat(60));
  console.log("📊 EVOLUTION RESULTS");
  console.log("═".repeat(60));

  // Sort by efficiency (sources per call)
  results.sort((a, b) => b.efficiency - a.efficiency);

  console.log("\n| Rank | Strategy | Calls/Phone | Sources/Phone | Efficiency |");
  console.log("|------|----------|-------------|---------------|------------|");

  results.forEach((r, i) => {
    const marker = i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
    console.log(`| ${marker} ${i + 1} | ${r.name.padEnd(18)} | ${r.callsPerPhone.toFixed(1).padStart(11)} | ${r.avgSourcesPerPhone.toFixed(1).padStart(13)} | ${r.efficiency.toFixed(2).padStart(10)} |`);
  });

  // Compare to baseline
  const baseline = results.find(r => r.name === "Current-Individual");
  const winner = results[0];

  if (baseline && winner && winner.name !== "Current-Individual") {
    const callReduction = ((baseline.callsPerPhone - winner.callsPerPhone) / baseline.callsPerPhone * 100).toFixed(0);
    const coverageChange = ((winner.avgSourcesPerPhone - baseline.avgSourcesPerPhone) / baseline.avgSourcesPerPhone * 100).toFixed(0);

    console.log(`\n🏆 WINNER: ${winner.name}`);
    console.log(`   - ${callReduction}% fewer API calls`);
    console.log(`   - ${coverageChange}% coverage change`);
    console.log(`   - Strategy: ${winner.description}`);
  }

  // Save results
  const outputPath = `data/lzfof_tests/cse_merged_evolution_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)}.json`;
  const fs = await import("fs/promises");
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to ${outputPath}`);
}

runEvolution().catch(console.error);
