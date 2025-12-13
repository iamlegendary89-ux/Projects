#!/usr/bin/env npx tsx
// @ts-nocheck - Test utility file
/**
 * LZFOF Prompt Variant Batch Test Runner
 * Tests multiple prompt variants sequentially on the same phone
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFile, writeFile, mkdir, readdir } from "fs/promises";

// Import all variants
import { buildPrompt as v1 } from "../variants/buildPrompt/v1-minimal.js";
import { buildPrompt as v2 } from "../variants/buildPrompt/v2-structured.js";
import { buildPrompt as v3 } from "../variants/buildPrompt/v3-chain-of-thought.js";
import { buildPrompt as v4 } from "../variants/buildPrompt/v4-few-shot.js";
import { buildPrompt as v5 } from "../variants/buildPrompt/v5-persona-expert.js";

const VARIANTS = [
  { name: "v1-minimal", fn: v1 },
  { name: "v2-structured", fn: v2 },
  { name: "v3-chain-of-thought", fn: v3 },
  { name: "v4-few-shot", fn: v4 },
  { name: "v5-persona-expert", fn: v5 },
];

const PHONE = { brand: "apple", model: "iphone 15 pro" };
const MODEL = "tngtech/deepseek-r1t2-chimera:free";

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
): Promise<{ success: boolean; metrics: Record<string, unknown>; result: unknown }> {
  const apiKey = process.env["OPENROUTER_API_KEY"]!;
  const prompt = variant.fn(fileCount, phoneName, reviewsText);

  console.log(`\n📝 Prompt: ${prompt.length} chars (~${Math.ceil(prompt.length / 3.2)} tokens)`);
  console.log("⏳ Calling API...");

  const start = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://smartmatch.ai",
        "X-Title": `SmartMatch LZFOF ${variant.name}`,
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

async function main() {
  console.log("🧪 LZFOF Batch A/B Test: v1 to v5");
  console.log(`📱 Phone: ${PHONE.brand} ${PHONE.model}\n`);

  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) { throw new Error("OPENROUTER_API_KEY missing"); }

  console.log("📂 Loading reviews...");
  const { reviewsText, files } = await loadReviews();
  console.log(`✅ Loaded ${files.length} review files\n`);

  const phoneName = `${PHONE.brand} ${PHONE.model}`;
  const outputDir = "data/lzfof_tests";
  await mkdir(outputDir, { recursive: true });

  const results: Record<string, unknown> = {};

  for (const variant of VARIANTS) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🔬 Testing: ${variant.name}`);
    console.log("=".repeat(60));

    const { success, metrics, result } = await testVariant(variant, reviewsText, files.length, phoneName);

    if (success) {
      console.log(`✅ Success in ${((metrics["elapsedMs"] as number) / 1000).toFixed(1)}s`);
      console.log(`📊 Tokens: ${metrics["totalTokens"]} (prompt: ${metrics["promptTokens"]}, completion: ${metrics["completionTokens"]})`);

      if ((result as any).attributes) {
        console.log("📈 Scores:", (result as any).attributes.map((a: any) => `${a.name}: ${a.score}`).join(", "));
      }
    } else {
      console.log(`❌ Failed: ${(result as any).error || "Unknown"}`);
    }

    results[variant.name] = { success, metrics, result };

    // Save individual result
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const outputFile = `${outputDir}/${PHONE.brand}_${PHONE.model.replace(/\s+/g, "_")}_${variant.name}_${timestamp}.json`;
    await writeFile(outputFile, JSON.stringify({ variant: variant.name, phone: phoneName, timestamp: new Date().toISOString(), model: MODEL, metrics, result }, null, 2));
    console.log(`💾 Saved: ${outputFile}`);

    // Rate limit pause between calls
    if (VARIANTS.indexOf(variant) < VARIANTS.length - 1) {
      console.log("⏸️ Waiting 5s before next variant...");
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log("\n| Variant | Prompt Tokens | Completion | Time | Parse |");
  console.log("|---------|---------------|------------|------|-------|");

  for (const name of Object.keys(results)) {
    const r = results[name] as { success: boolean; metrics: Record<string, unknown> };
    console.log(`| ${name.padEnd(20)} | ${String(r.metrics["promptTokens"] || "?").padStart(13)} | ${String(r.metrics["completionTokens"] || "?").padStart(10)} | ${(((r.metrics["elapsedMs"] as number) || 0) / 1000).toFixed(1).padStart(4)}s | ${r.success ? "✅" : "❌"} |`);
  }

  // Save combined summary
  const summaryFile = `${outputDir}/summary_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)}.json`;
  await writeFile(summaryFile, JSON.stringify({ phone: phoneName, model: MODEL, timestamp: new Date().toISOString(), results }, null, 2));
  console.log(`\n📁 Summary saved: ${summaryFile}`);
}

main().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
