#!/usr/bin/env npx tsx
// @ts-nocheck - Test utility file
/**
 * LZFOF Prompt Variant A/B Test Runner
 * Tests a single prompt variant on a phone and saves the output
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { buildPrompt } from "../variants/buildPrompt/v4-few-shot.js";

const PHONE = { brand: "samsung", model: "galaxy s25" };
const VARIANT = "v4-few-shot-retry";

async function main() {
  console.log(`\n🧪 LZFOF A/B Test: ${VARIANT}`);
  console.log(`📱 Phone: ${PHONE.brand} ${PHONE.model}\n`);

  // Load review files
  const dir = `data/content/${PHONE.brand}_${PHONE.model.replace(/\s+/g, "_")}`;
  const files = (await readdir(dir)).filter(f => f.endsWith(".txt")).sort();

  console.log(`📄 Found ${files.length} review files`);

  // Parse reviews
  const reviews: string[] = [];
  for (const [i, file] of files.entries()) {
    const content = await readFile(`${dir}/${file}`, "utf8");
    const source = file.replace(/^\d+_/, "").replace(/\.txt$/, "").replace(/_/g, " ");
    reviews.push(`─── REVIEW ${i + 1}: ${source} ───\n${content}\n`);
    console.log(`  ✓ Loaded ${file} (${(content.length / 1024).toFixed(1)}KB)`);
  }

  const reviewsText = reviews.join("\n");
  const phoneName = `${PHONE.brand} ${PHONE.model}`;

  // Build prompt
  const prompt = buildPrompt(files.length, phoneName, reviewsText);
  console.log(`\n📝 Prompt built: ${prompt.length} chars (~${Math.ceil(prompt.length / 3.2)} tokens)`);

  // Call API
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) { throw new Error("OPENROUTER_API_KEY missing"); }

  const model = "tngtech/deepseek-r1t2-chimera:free";
  console.log(`🤖 Model: ${model}`);
  console.log("⏳ Calling API...");

  const start = Date.now();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://smartmatch.ai",
      "X-Title": "SmartMatch LZFOF A/B Test",
    },
    body: JSON.stringify({
      model,
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
  const tokens = data.usage?.total_tokens || 0;

  console.log(`✅ Response received in ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`📊 Tokens: ${tokens} (prompt: ${data.usage?.prompt_tokens || "?"}, completion: ${data.usage?.completion_tokens || "?"})`);

  // Parse and validate JSON
  let parsed;
  try {
    const clean = content.replace(/^```json\n|```$/g, "").trim();
    parsed = JSON.parse(clean);
    console.log("✅ JSON parsed successfully");
  } catch (e) {
    console.error("❌ JSON parse failed:", e);
    console.log("Raw output (first 500 chars):", content.substring(0, 500));
    parsed = { error: "Parse failed", raw: content };
  }

  // Save output
  const outputDir = "data/lzfof_tests";
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const outputFile = `${outputDir}/${PHONE.brand}_${PHONE.model.replace(/\s+/g, "_")}_${VARIANT}_${timestamp}.json`;

  const output = {
    variant: VARIANT,
    phone: phoneName,
    timestamp: new Date().toISOString(),
    model,
    metrics: {
      promptLength: prompt.length,
      promptTokensEstimate: Math.ceil(prompt.length / 3.2),
      actualTokens: tokens,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      elapsedMs: elapsed,
    },
    result: parsed,
  };

  await writeFile(outputFile, JSON.stringify(output, null, 2));
  console.log(`\n💾 Saved: ${outputFile}`);

  // Summary
  if (parsed.attributes) {
    console.log("\n📊 Scores:");
    for (const attr of parsed.attributes) {
      console.log(`   ${attr.name}: ${attr.score}`);
    }
  }
  if (parsed.summary_1_page) {
    console.log("\n📝 Summary (first 200 chars):");
    console.log(`   ${parsed.summary_1_page.substring(0, 200)}...`);
  }
}

main().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
