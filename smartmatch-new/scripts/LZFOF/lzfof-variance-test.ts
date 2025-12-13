#!/usr/bin/env npx tsx
// @ts-nocheck - Test utility file
/**
 * LZFOF Variance Test - Runs v2, v3, v4 again to check consistency
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFile, writeFile, mkdir, readdir } from "fs/promises";

import { buildPrompt as v2 } from "../variants/buildPrompt/v2-structured.js";
import { buildPrompt as v3 } from "../variants/buildPrompt/v3-chain-of-thought.js";
import { buildPrompt as v4 } from "../variants/buildPrompt/v4-few-shot.js";

const VARIANTS = [
  { name: "v2-structured", fn: v2 },
  { name: "v3-chain-of-thought", fn: v3 },
  { name: "v4-few-shot", fn: v4 },
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

  console.log(`   Prompt: ${prompt.length} chars, calling API...`);

  const start = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://smartmatch.ai",
        "X-Title": `SmartMatch LZFOF ${variant.name} Run2`,
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
  console.log("🔁 LZFOF Variance Test: v2, v3, v4 (Run 2)");
  console.log(`📱 Phone: ${PHONE.brand} ${PHONE.model}\n`);

  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) { throw new Error("OPENROUTER_API_KEY missing"); }

  const { reviewsText, files } = await loadReviews();
  console.log(`✅ Loaded ${files.length} review files\n`);

  const phoneName = `${PHONE.brand} ${PHONE.model}`;
  const outputDir = "data/lzfof_tests";
  await mkdir(outputDir, { recursive: true });

  for (const variant of VARIANTS) {
    console.log(`🔬 ${variant.name}...`);

    const { success, metrics, result } = await testVariant(variant, reviewsText, files.length, phoneName);

    if (success && (result as any).attributes) {
      const scores = (result as any).attributes.map((a: any) => `${a.name.substring(0, 3)}:${a.score}`).join(" ");
      console.log(`   ✅ ${((metrics["elapsedMs"] as number) / 1000).toFixed(0)}s | ${scores}`);
    } else {
      console.log("   ❌ Failed");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const outputFile = `${outputDir}/${PHONE.brand}_${PHONE.model.replace(/\s+/g, "_")}_${variant.name}_run2_${timestamp}.json`;
    await writeFile(outputFile, JSON.stringify({ variant: variant.name, run: 2, phone: phoneName, timestamp: new Date().toISOString(), model: MODEL, metrics, result }, null, 2));

    // Rate limit pause
    if (VARIANTS.indexOf(variant) < VARIANTS.length - 1) {
      console.log("   ⏸️ Waiting 10s...");
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  console.log("\n✅ Variance test complete!");
}

main().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
