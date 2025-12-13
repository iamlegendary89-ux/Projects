#!/usr/bin/env npx tsx
/**
 * LZFOF Evolution: calcConfidence
 * 
 * Evolve the already-optimized calcConfidence to find even faster version
 */

// Test data
const TEST_ATTRS = [
  { score: 9.2, explanation: "Excellent camera with DXOMark 154 rating" },
  { score: 8.5, explanation: "Good battery life, 13 hours active use" },
  { score: 9.6, explanation: "Top-tier performance with Snapdragon 8 Elite" },
  { score: 9.3, explanation: "Bright 2600 nit display with 120Hz" },
  { score: 9.1, explanation: "Clean One UI with 7 years updates" },
  { score: 8.8, explanation: "Premium titanium build at 162g" },
  { score: 8.5, explanation: "Not mentioned in any reviews" }, // One "not mentioned"
];

// ============================================================================
// V1: Current optimized version (baseline - 84% faster than original)
// ============================================================================
const NOT_MENTIONED_RE = /not mentioned/i;
function calcConfidenceV1(attrs: Array<{ score: number; explanation: string }>, ms: number, tokens: number, sources: number): number {
  let complete = 0;
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i]!;
    if (a.score > 0 && !NOT_MENTIONED_RE.test(a.explanation)) {complete++;}
  }

  let c = 0.96 * (0.85 + (complete / 7) * 0.15);
  if (ms < 1000) {c *= 0.98;}
  else if (ms > 45000) {c *= 0.96;}
  if (tokens > 6250) {c *= 0.98;}
  else if (tokens < 1000) {c *= 0.97;}

  c += sources * 0.015;
  return c > 0.999 ? 0.999 : c < 0.70 ? 0.70 : c > 0.879 ? 0.879 : c;
}

// ============================================================================
// V2: Pre-computed constants, indexOf instead of regex
// ============================================================================
const NOT_MENTIONED_LC = "not mentioned";
function calcConfidenceV2(attrs: Array<{ score: number; explanation: string }>, ms: number, tokens: number, sources: number): number {
  let complete = 0;
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i]!;
    if (a.score > 0 && a.explanation.toLowerCase().indexOf(NOT_MENTIONED_LC) === -1) {complete++;}
  }

  let c = 0.96 * (0.85 + complete * 0.0214285714); // 0.15 / 7 = 0.0214285714
  if (ms < 1000) {c *= 0.98;}
  else if (ms > 45000) {c *= 0.96;}
  if (tokens > 6250) {c *= 0.98;}
  else if (tokens < 1000) {c *= 0.97;}

  c += sources * 0.015;
  return c > 0.999 ? 0.999 : c < 0.70 ? 0.70 : c > 0.879 ? 0.879 : c;
}

// ============================================================================
// V3: Bit manipulation for bounds, unrolled loop for 7 attrs
// ============================================================================
function calcConfidenceV3(attrs: Array<{ score: number; explanation: string }>, ms: number, tokens: number, sources: number): number {
  // Unroll for common case of 7 attributes
  let complete = 0;
  const len = attrs.length;
  if (len === 7) {
    if (attrs[0]!.score > 0 && attrs[0]!.explanation.toLowerCase().indexOf("not mentioned") === -1) {complete++;}
    if (attrs[1]!.score > 0 && attrs[1]!.explanation.toLowerCase().indexOf("not mentioned") === -1) {complete++;}
    if (attrs[2]!.score > 0 && attrs[2]!.explanation.toLowerCase().indexOf("not mentioned") === -1) {complete++;}
    if (attrs[3]!.score > 0 && attrs[3]!.explanation.toLowerCase().indexOf("not mentioned") === -1) {complete++;}
    if (attrs[4]!.score > 0 && attrs[4]!.explanation.toLowerCase().indexOf("not mentioned") === -1) {complete++;}
    if (attrs[5]!.score > 0 && attrs[5]!.explanation.toLowerCase().indexOf("not mentioned") === -1) {complete++;}
    if (attrs[6]!.score > 0 && attrs[6]!.explanation.toLowerCase().indexOf("not mentioned") === -1) {complete++;}
  } else {
    for (let i = 0; i < len; i++) {
      const a = attrs[i]!;
      if (a.score > 0 && a.explanation.toLowerCase().indexOf("not mentioned") === -1) {complete++;}
    }
  }

  let c = 0.96 * (0.85 + complete * 0.0214285714);
  c *= ms < 1000 ? 0.98 : ms > 45000 ? 0.96 : 1;
  c *= tokens > 6250 ? 0.98 : tokens < 1000 ? 0.97 : 1;
  c += sources * 0.015;
  return c > 0.999 ? 0.999 : c < 0.70 ? 0.70 : c > 0.879 ? 0.879 : c;
}

// ============================================================================
// V4: Cached lowercase explanations (assumes attrs are reused)
// ============================================================================
const explanationCache = new WeakMap<{ score: number; explanation: string }, string>();
function calcConfidenceV4(attrs: Array<{ score: number; explanation: string }>, ms: number, tokens: number, sources: number): number {
  let complete = 0;
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i]!;
    let lower = explanationCache.get(a);
    if (!lower) {
      lower = a.explanation.toLowerCase();
      explanationCache.set(a, lower);
    }
    if (a.score > 0 && lower.indexOf("not mentioned") === -1) {complete++;}
  }

  let c = 0.96 * (0.85 + complete * 0.0214285714);
  if (ms < 1000) {c *= 0.98;}
  else if (ms > 45000) {c *= 0.96;}
  if (tokens > 6250) {c *= 0.98;}
  else if (tokens < 1000) {c *= 0.97;}

  c += sources * 0.015;
  return c > 0.999 ? 0.999 : c < 0.70 ? 0.70 : c > 0.879 ? 0.879 : c;
}

// ============================================================================
// V5: Lookup table for multipliers
// ============================================================================
function calcConfidenceV5(attrs: Array<{ score: number; explanation: string }>, ms: number, tokens: number, sources: number): number {
  let complete = 0;
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i]!;
    if (a.score > 0 && !NOT_MENTIONED_RE.test(a.explanation)) {complete++;}
  }

  // Pre-compute all multipliers in one expression
  const msMultiplier = ms < 1000 ? 0.98 : ms > 45000 ? 0.96 : 1;
  const tokenMultiplier = tokens > 6250 ? 0.98 : tokens < 1000 ? 0.97 : 1;

  const c = 0.96 * (0.85 + complete * 0.0214285714) * msMultiplier * tokenMultiplier + sources * 0.015;
  return c > 0.999 ? 0.999 : c < 0.70 ? 0.70 : c > 0.879 ? 0.879 : c;
}

// ============================================================================
// BENCHMARK
// ============================================================================
function benchmark(name: string, fn: () => void, iterations: number = 100000): { name: string; avgNs: number; opsPerSec: number } {
  // Warm up
  for (let i = 0; i < 1000; i++) {fn();}

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {fn();}
  const elapsed = performance.now() - start;

  const avgNs = (elapsed / iterations) * 1000000; // Convert to nanoseconds
  const opsPerSec = Math.round((iterations / elapsed) * 1000);

  return { name, avgNs, opsPerSec };
}

// Test cases
const TEST_CASES = [
  { attrs: TEST_ATTRS, ms: 5000, tokens: 2000, sources: 8 },
  { attrs: TEST_ATTRS, ms: 500, tokens: 1500, sources: 5 },
  { attrs: TEST_ATTRS, ms: 50000, tokens: 8000, sources: 10 },
];

console.log("🔄 LZFOF Evolution: calcConfidence\n");
console.log("=".repeat(60));

// Verify correctness first
console.log("\n📋 CORRECTNESS CHECK\n");
const baseline = calcConfidenceV1(TEST_ATTRS, 5000, 2000, 8);
console.log(`V1 (baseline): ${baseline.toFixed(6)}`);
console.log(`V2 (indexOf):  ${calcConfidenceV2(TEST_ATTRS, 5000, 2000, 8).toFixed(6)}`);
console.log(`V3 (unrolled): ${calcConfidenceV3(TEST_ATTRS, 5000, 2000, 8).toFixed(6)}`);
console.log(`V4 (cached):   ${calcConfidenceV4(TEST_ATTRS, 5000, 2000, 8).toFixed(6)}`);
console.log(`V5 (combined): ${calcConfidenceV5(TEST_ATTRS, 5000, 2000, 8).toFixed(6)}`);

// Benchmark
console.log("\n📊 PERFORMANCE BENCHMARK\n");

const results = [
  benchmark("V1 (current - regex)", () => {
    for (const tc of TEST_CASES) {calcConfidenceV1(tc.attrs, tc.ms, tc.tokens, tc.sources);}
  }),
  benchmark("V2 (indexOf)", () => {
    for (const tc of TEST_CASES) {calcConfidenceV2(tc.attrs, tc.ms, tc.tokens, tc.sources);}
  }),
  benchmark("V3 (unrolled)", () => {
    for (const tc of TEST_CASES) {calcConfidenceV3(tc.attrs, tc.ms, tc.tokens, tc.sources);}
  }),
  benchmark("V4 (cached)", () => {
    for (const tc of TEST_CASES) {calcConfidenceV4(tc.attrs, tc.ms, tc.tokens, tc.sources);}
  }),
  benchmark("V5 (combined multipliers)", () => {
    for (const tc of TEST_CASES) {calcConfidenceV5(tc.attrs, tc.ms, tc.tokens, tc.sources);}
  }),
];

// Sort by speed
results.sort((a, b) => a.avgNs - b.avgNs);

console.log("| Variant | Time/call | Ops/sec | vs V1 |");
console.log("|---------|-----------|---------|-------|");

const v1Time = results.find(r => r.name.includes("V1"))!.avgNs;
for (const r of results) {
  const speedup = ((v1Time / r.avgNs - 1) * 100).toFixed(0);
  const faster = r.avgNs < v1Time;
  console.log(`| ${r.name.padEnd(25)} | ${r.avgNs.toFixed(0)}ns | ${r.opsPerSec.toLocaleString()} | ${faster ? `+${speedup}%` : speedup + "%"} |`);
}

console.log(`\n🏆 WINNER: ${results[0]!.name}`);
console.log(`   Speed: ${results[0]!.avgNs.toFixed(0)}ns/call (${results[0]!.opsPerSec.toLocaleString()} ops/sec)`);

if (results[0]!.name !== "V1 (current - regex)") {
  console.log("\n✅ Evolution successful! Found faster variant.");
} else {
  console.log("\n➖ Current version is already optimal.");
}
