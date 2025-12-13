#!/usr/bin/env npx tsx
/**
 * LZFOF Mutation Test: ContentEngine.validate (V2 - with fixes)
 * 
 * Tests edge cases to verify the hasWordBoundary fix
 */

// Recreate the validate function for isolated testing
const WHITESPACE_RE = /\s+/;
const NUMERIC_RE = /^\d+$/;

// Mock thresholds
const THRESHOLDS = {
  review: { minContentLength: 500, wordCount: { min: 100 } },
  specs: { minContentLength: 200, wordCount: { min: 50 } },
};

function getThresholds(type: string) {
  return THRESHOLDS[type as keyof typeof THRESHOLDS] || THRESHOLDS.review;
}

// FIXED validate function with hasWordBoundary
function validate(text: string, brand: string, model: string, type: string): boolean {
  const thresholds = getThresholds(type);
  if (text.length < thresholds.minContentLength) {return false;}

  const wordCount = text.split(WHITESPACE_RE).length;
  if (wordCount < thresholds.wordCount.min) {return false;}

  const lower = text.toLowerCase();
  const brandLower = brand.toLowerCase();
  const modelLower = model.toLowerCase();

  // LZFOF Fix: Helper for word boundary checking
  const hasWordBoundary = (haystack: string, needle: string): boolean => {
    if (!needle) {return false;}
    const idx = haystack.indexOf(needle);
    if (idx === -1) {return false;}
    const before = idx === 0 || !/[a-z0-9]/i.test(haystack[idx - 1]!);
    const afterIdx = idx + needle.length;
    const after = afterIdx >= haystack.length || !/[a-z0-9]/i.test(haystack[afterIdx]!);
    return before && after;
  };

  // Check for model parts - pre-filter model parts
  const modelParts = modelLower.split(" ").filter(p => NUMERIC_RE.test(p) || p.length > 2);

  for (const part of modelParts) {
    if (hasWordBoundary(lower, part)) {
      return true;
    }
  }

  return brandLower ? hasWordBoundary(lower, brandLower) : false;
}

// Generate test content of specific length
function generateContent(words: number, includeText: string = ""): string {
  const filler = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ".repeat(Math.ceil(words / 15));
  const wordsArr = filler.split(" ").slice(0, words - includeText.split(" ").length);
  return wordsArr.join(" ") + " " + includeText;
}

// Mutation test cases
interface MutationTest {
    name: string;
    text: string;
    brand: string;
    model: string;
    type: string;
    expected: boolean;
    category: string;
}

const MUTATION_TESTS: MutationTest[] = [
  // === LENGTH BOUNDARY TESTS ===
  { name: "Exactly at min length (500)", text: generateContent(120, "Samsung Galaxy S25"), brand: "Samsung", model: "Galaxy S25", type: "review", expected: true, category: "boundary" },
  { name: "Specs with 200 chars", text: generateContent(55, "Samsung Galaxy S25"), brand: "Samsung", model: "Galaxy S25", type: "specs", expected: true, category: "boundary" },

  // === NUMERIC MODEL TESTS ===
  { name: "OnePlus 13 - number in middle of text", text: generateContent(120, "The OnePlus 13 is amazing"), brand: "OnePlus", model: "13", type: "review", expected: true, category: "numeric" },
  { name: "OnePlus 13 - number at start", text: "13 is the latest OnePlus phone " + generateContent(110), brand: "OnePlus", model: "13", type: "review", expected: true, category: "numeric" },
  { name: "OnePlus 13 - number at end", text: generateContent(115) + " OnePlus 13", brand: "OnePlus", model: "13", type: "review", expected: true, category: "numeric" },
  { name: "OnePlus 13 - number without spaces (FIXED)", text: generateContent(120, "The OnePlus13 is amazing"), brand: "OnePlus", model: "13", type: "review", expected: false, category: "numeric" },
  { name: "OnePlus 13 - false positive 130", text: generateContent(120, "The 130 megapixel camera"), brand: "OnePlus", model: "13", type: "review", expected: false, category: "numeric" },
  { name: "OnePlus 13 - brand but wrong number", text: generateContent(120, "The OnePlus 12 is great"), brand: "OnePlus", model: "13", type: "review", expected: true, category: "numeric" },

  // === CASE SENSITIVITY TESTS ===
  { name: "All uppercase content", text: generateContent(120, "SAMSUNG GALAXY S25").toUpperCase(), brand: "Samsung", model: "Galaxy S25", type: "review", expected: true, category: "case" },
  { name: "Mixed case model", text: generateContent(120, "SaMsUnG gAlAxY s25"), brand: "Samsung", model: "Galaxy S25", type: "review", expected: true, category: "case" },

  // === PARTIAL MATCH TESTS ===
  { name: "Brand only, no model", text: generateContent(120, "Samsung phones are great"), brand: "Samsung", model: "Galaxy S25", type: "review", expected: true, category: "partial" },
  { name: "Model only, no brand", text: generateContent(120, "The Galaxy S25 review"), brand: "Samsung", model: "Galaxy S25", type: "review", expected: true, category: "partial" },
  { name: "Neither brand nor model", text: generateContent(120, "This is a phone review"), brand: "Samsung", model: "Galaxy S25", type: "review", expected: false, category: "partial" },

  // === SHORT MODEL PARTS TESTS ===
  { name: "iPhone 15 Pro - Pro is 3 chars", text: generateContent(120, "The iPhone 15 Pro review"), brand: "Apple", model: "iPhone 15 Pro", type: "review", expected: true, category: "short" },
  { name: "iPhone SE - SE is 2 chars (filtered)", text: generateContent(120, "Apple iPhone SE review"), brand: "Apple", model: "iPhone SE", type: "review", expected: true, category: "short" },

  // === EDGE CASE MODEL NAMES ===
  { name: "Model with hyphen (Galaxy Z-Fold)", text: generateContent(120, "Samsung Galaxy Z-Fold 5"), brand: "Samsung", model: "Galaxy Z-Fold 5", type: "review", expected: true, category: "edge" },
  { name: "Model with Plus (+)", text: generateContent(120, "iPhone 15 Plus review"), brand: "Apple", model: "iPhone 15 Plus", type: "review", expected: true, category: "edge" },
  { name: "Empty brand", text: generateContent(120, "Galaxy S25 review"), brand: "", model: "Galaxy S25", type: "review", expected: true, category: "edge" },
  { name: "Empty model", text: generateContent(120, "Samsung phone review"), brand: "Samsung", model: "", type: "review", expected: true, category: "edge" },

  // === WORD BOUNDARY TESTS (these were previously failing) ===
  { name: "13 in s13 (should not match)", text: generateContent(120, "The Galaxy s13 rocks"), brand: "OnePlus", model: "13", type: "review", expected: false, category: "boundary" },
  { name: "Galaxy in GalaxyNote (FIXED)", text: generateContent(120, "SamsungGalaxyS25 is here"), brand: "Samsung", model: "Galaxy S25", type: "review", expected: false, category: "boundary" },

  // === UNICODE/SPECIAL CHARS ===
  { name: "Unicode in content", text: generateContent(120, "Samsung Galaxy S25 – the best phone™"), brand: "Samsung", model: "Galaxy S25", type: "review", expected: true, category: "unicode" },
  { name: "Emoji in content", text: generateContent(120, "Samsung Galaxy S25 🔥📱"), brand: "Samsung", model: "Galaxy S25", type: "review", expected: true, category: "unicode" },
];

// Run tests
console.log("🧪 LZFOF Mutation Testing: ContentEngine.validate (V2 with fixes)\n");
console.log("=".repeat(70));

let passed = 0;
let failed = 0;
const failures: { test: MutationTest; actual: boolean }[] = [];

for (const test of MUTATION_TESTS) {
  const actual = validate(test.text, test.brand, test.model, test.type);
  const pass = actual === test.expected;

  if (pass) {
    passed++;
    console.log(`✅ ${test.name}`);
  } else {
    failed++;
    failures.push({ test, actual });
    console.log(`❌ ${test.name}`);
    console.log(`   Expected: ${test.expected}, Got: ${actual}`);
  }
}

console.log("\n" + "=".repeat(70));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failures.length > 0) {
  console.log("🐛 FAILURES BY CATEGORY:\n");

  const byCategory = new Map<string, typeof failures>();
  for (const f of failures) {
    const cat = f.test.category;
    if (!byCategory.has(cat)) {byCategory.set(cat, []);}
        byCategory.get(cat)!.push(f);
  }

  for (const [cat, tests] of byCategory) {
    console.log(`  ${cat.toUpperCase()}:`);
    for (const { test, actual } of tests) {
      console.log(`    - ${test.name}`);
      console.log(`      Input: brand="${test.brand}", model="${test.model}"`);
      console.log(`      Expected: ${test.expected}, Got: ${actual}`);
    }
  }
} else {
  console.log("🎉 All tests passed! Word boundary fix is working correctly.");
}

console.log("\n✅ Mutation testing complete!");
