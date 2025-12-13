#!/usr/bin/env npx tsx
// @ts-nocheck - Test utility file
/**
 * V7 Variance Test - Run v7 twice on both phones
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { buildPrompt } from "../variants/buildPrompt/v7-optimized.js";

const PHONES = [
  { brand: "apple", model: "iphone 15 pro" },
  { brand: "samsung", model: "galaxy s25" },
];

const MODEL = "tngtech/deepseek-r1t2-chimera:free";
const RUNS = 2;

async function loadReviews(phone: { brand: string; model: string }): Promise<{ reviewsText: string; files: string[] }> {
  const dir = `data/content/${phone.brand}_${phone.model.replace(/\s+/g, "_")}`;
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
  reviewsText: string,
  fileCount: number,
  phoneName: string,
): Promise<{ success: boolean; metrics: Record<string, unknown>; result: unknown }> {
  const apiKey = process.env["OPENROUTER_API_KEY"]!;
  const prompt = buildPrompt(fileCount, phoneName, reviewsText);

  const start = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://smartmatch.ai",
        "X-Title": "SmartMatch v7-optimized",
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
  console.log("🎯 V7 VARIANCE TEST");
  console.log("═".repeat(50) + "\n");

  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) { throw new Error("OPENROUTER_API_KEY missing"); }

  const outputDir = "data/lzfof_tests";
  await mkdir(outputDir, { recursive: true });

  const allResults: Record<string, Record<string, number>[]> = {};

  for (const phone of PHONES) {
    const phoneName = `${phone.brand} ${phone.model}`;
    console.log(`\n📱 ${phoneName}`);
    console.log("─".repeat(40));

    const { reviewsText, files } = await loadReviews(phone);
    console.log(`   ${files.length} review files loaded`);

    allResults[phoneName] = [];

    for (let run = 1; run <= RUNS; run++) {
      console.log(`\n   Run ${run}...`);

      const { success, metrics, result } = await testVariant(reviewsText, files.length, phoneName);
      const scores = extractScores(result);

      if (success) {
        const time = ((metrics["elapsedMs"] as number) / 1000).toFixed(0);
        console.log(`   ✅ ${time}s | tokens: ${metrics["completionTokens"]}`);
        console.log(`   Cam:${scores["Camera"]} Bat:${scores["Battery Endurance"]} Per:${scores["Performance"]} Dis:${scores["Display"]}`);
        console.log(`   Sof:${scores["Software Experience"]} Des:${scores["Design & Build"]} Lon:${scores["Longevity Value"]}`);
        allResults[phoneName]!.push(scores);
      } else {
        console.log(`   ❌ Failed: ${(result as any).error}`);
        allResults[phoneName]!.push({});
      }

      // Save
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `${phone.brand}_${phone.model.replace(/\s+/g, "_")}_v7-optimized_run${run}_${timestamp}.json`;
      await writeFile(`${outputDir}/${filename}`, JSON.stringify({ variant: "v7-optimized", run, phone: phoneName, timestamp: new Date().toISOString(), model: MODEL, metrics, result }, null, 2));

      if (run < RUNS) {
        console.log("   ⏸️ Waiting 10s...");
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  }

  // Variance Summary
  console.log("\n" + "═".repeat(50));
  console.log("📊 V7 VARIANCE SUMMARY");
  console.log("═".repeat(50));

  for (const [phoneName, runs] of Object.entries(allResults)) {
    if (runs.length < 2 || !runs[0]?.["Camera"]) { continue; }

    console.log(`\n📱 ${phoneName}:`);
    const attrs = Object.keys(runs[0]);
    let totalVariance = 0;

    for (const attr of attrs) {
      const r1 = runs[0]![attr] || 0;
      const r2 = runs[1]![attr] || 0;
      const delta = Math.abs(r1 - r2);
      totalVariance += delta;
      const flag = delta === 0 ? "✅" : delta <= 0.15 ? "➖" : delta <= 0.30 ? "⚠️" : "❌";
      console.log(`   ${attr.padEnd(20)}: ${r1} → ${r2} (Δ ${delta.toFixed(2)}) ${flag}`);
    }
    console.log(`   TOTAL VARIANCE: ${totalVariance.toFixed(2)} (avg: ${(totalVariance / attrs.length).toFixed(2)})`);
  }

  console.log("\n✅ V7 variance test complete!");
}

main().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
