#!/usr/bin/env npx tsx
// @ts-nocheck - Test utility file
/**
 * LZFOF Head-to-Head: v0-original vs v4-few-shot on Samsung S25
 * Runs 2 cycles of each for variance comparison
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFile, writeFile, mkdir, readdir } from "fs/promises";

import { buildPrompt as v0 } from "../variants/buildPrompt/v0-original.js";
import { buildPrompt as v4 } from "../variants/buildPrompt/v4-few-shot.js";

const VARIANTS = [
  { name: "v0-original", fn: v0 },
  { name: "v4-few-shot", fn: v4 },
];

const PHONE = { brand: "samsung", model: "galaxy s25" };
const MODEL = "tngtech/deepseek-r1t2-chimera:free";
const RUNS = 2;

async function loadReviews(): Promise<{ reviewsText: string; files: string[] }> {
  const dir = `data/content/${PHONE.brand}_${PHONE.model.replace(/\s+/g, "_")}`;
  const files = (await readdir(dir)).filter(f => f.endsWith(".txt")).sort();

  const reviews: string[] = [];
  for (const [i, file] of files.entries()) {
    const content = await readFile(`${dir}/${file}`, "utf8");
    const source = file.replace(/^\d+_/, "").replace(/\.txt$/, "").replace(/_/g, " ");
    reviews.push(`─── REVIEW ${i + 1}: ${source} ───\n${content}\n`);
  }

  return { reviewsText: reviews.join("\n"), files };
}

async function testVariant(
  variant: { name: string; fn: (n: number, p: string, r: string) => string },
  reviewsText: string,
  fileCount: number,
  phoneName: string,
  run: number,
): Promise<{ success: boolean; metrics: Record<string, unknown>; result: unknown }> {
  const apiKey = process.env["OPENROUTER_API_KEY"]!;
  const prompt = variant.fn(fileCount, phoneName, reviewsText);

  const start = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://smartmatch.ai",
        "X-Title": `SmartMatch ${variant.name} Run${run}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error (${res.status}): ${text.substring(0, 200)}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number; prompt_tokens?: number; completion_tokens?: number };
    };

    const elapsed = Date.now() - start;
    const content = data.choices[0]?.message?.content?.trim() || "";

    let parsed;
    try {
      const clean = content.replace(/^```json\n|```$/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { error: "Parse failed", raw: content.substring(0, 500) };
    }

    return {
      success: !parsed.error,
      metrics: {
        promptLength: prompt.length,
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
        elapsedMs: elapsed,
      },
      result: parsed,
    };
  } catch (e) {
    return {
      success: false,
      metrics: { promptLength: prompt.length, elapsedMs: Date.now() - start },
      result: { error: e instanceof Error ? e.message : String(e) },
    };
  }
}

function extractScores(result: unknown): Record<string, number> {
  const scores: Record<string, number> = {};
  const attrs = (result as any)?.attributes;
  if (Array.isArray(attrs)) {
    for (const a of attrs) {
      scores[a.name] = a.score;
    }
  }
  return scores;
}

async function main() {
  console.log("⚔️  LZFOF Head-to-Head: v0-original vs v4-few-shot");
  console.log(`📱 Phone: ${PHONE.brand} ${PHONE.model}`);
  console.log(`🔄 Runs: ${RUNS} cycles each\n`);

  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) { throw new Error("OPENROUTER_API_KEY missing"); }

  const { reviewsText, files } = await loadReviews();
  console.log(`✅ Loaded ${files.length} review files\n`);

  const phoneName = `${PHONE.brand} ${PHONE.model}`;
  const outputDir = "data/lzfof_tests";
  await mkdir(outputDir, { recursive: true });

  const allResults: Record<string, { run: number; scores: Record<string, number>; time: number }[]> = {
    "v0-original": [],
    "v4-few-shot": [],
  };

  for (let run = 1; run <= RUNS; run++) {
    console.log(`\n${"═".repeat(50)}`);
    console.log(`🔄 RUN ${run}`);
    console.log("═".repeat(50));

    for (const variant of VARIANTS) {
      console.log(`\n🔬 ${variant.name}...`);
      console.log("   Calling API...");

      const { success, metrics, result } = await testVariant(variant, reviewsText, files.length, phoneName, run);

      const time = (metrics["elapsedMs"] as number) / 1000;
      const scores = extractScores(result);

      if (success) {
        console.log(`   ✅ ${time.toFixed(0)}s | Tokens: ${metrics["completionTokens"]}`);
        console.log(`   📊 Cam:${scores["Camera"]} Bat:${scores["Battery Endurance"]} Per:${scores["Performance"]} Dis:${scores["Display"]}`);
        console.log(`      Sof:${scores["Software Experience"]} Des:${scores["Design & Build"]} Lon:${scores["Longevity Value"]}`);
        allResults[variant.name]!.push({ run, scores, time });
      } else {
        console.log(`   ❌ Failed: ${(result as any).error || "Unknown"}`);
        allResults[variant.name]!.push({ run, scores: {}, time });
      }

      // Save result
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const outputFile = `${outputDir}/${PHONE.brand}_${PHONE.model.replace(/\s+/g, "_")}_${variant.name}_run${run}_${timestamp}.json`;
      await writeFile(outputFile, JSON.stringify({ variant: variant.name, run, phone: phoneName, timestamp: new Date().toISOString(), model: MODEL, metrics, result }, null, 2));

      // Rate limit pause
      console.log("   ⏸️ Waiting 10s...");
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  // Summary
  console.log(`\n${"═".repeat(50)}`);
  console.log("📊 VARIANCE SUMMARY");
  console.log("═".repeat(50));

  for (const name of ["v0-original", "v4-few-shot"]) {
    const runs = allResults[name]!;
    if (runs.length < 2 || !runs[0]!.scores["Camera"]) { continue; }

    console.log(`\n📦 ${name}:`);
    const attrs = Object.keys(runs[0]!.scores);
    for (const attr of attrs) {
      const r1 = runs[0]!.scores[attr] || 0;
      const r2 = runs[1]!.scores[attr] || 0;
      const delta = Math.abs(r1 - r2);
      const flag = delta === 0 ? "✅" : delta <= 0.3 ? "➖" : "⚠️";
      console.log(`   ${attr.padEnd(20)}: ${r1} → ${r2} (Δ ${delta.toFixed(2)}) ${flag}`);
    }
    console.log(`   Avg Time: ${((runs[0]!.time + runs[1]!.time) / 2).toFixed(0)}s`);
  }

  console.log("\n✅ Head-to-head complete!");
}

main().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
