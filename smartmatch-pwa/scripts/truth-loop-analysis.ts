
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { HVAM_WEIGHTS } from "../worker/core/hvam-config";

// Load Env
dotenv.config({ path: ".env.local" });

const CONFIG_PATH = path.resolve("worker/core/hvam-config.ts");
const sbUrl = process.env.SUPABASE_URL;
const sbKey = process.env.SUPABASE_SERVICE_KEY;

if (!sbUrl || !sbKey) {
  console.error("❌ Missing Supabase Credentials");
  process.exit(1);
}

const supabase = createClient(sbUrl, sbKey);

async function runAnalysis() {
  console.log("🔍 Starting Truth Loop Analysis...");

  // 1. Fetch Feedback (Last 24h)
  const { data: feedback, error } = await supabase
    .from("onyx_feedback")
    .select("rating, regret")
    .gt("created_at", new Date(Date.now() - 86400000).toISOString());

  if (error) {
    console.error("❌ Supabase Fetch Error:", JSON.stringify(error, null, 2));
    return;
  }
  if (!feedback || feedback.length === 0) {
    console.log("⚠️ No feedback found (0 rows).");
    return;
  }

  console.log(`   -> Analyzed ${feedback.length} records.`);

  // 2. Compute Metrics
  const totalRating = feedback.reduce((acc, f) => acc + f.rating, 0);
  const avgRating = totalRating / feedback.length;
  const regretCount = feedback.filter(f => f.regret).length;
  const regretRate = regretCount / feedback.length;

  console.log(`   -> Avg Rating: ${avgRating.toFixed(2)} / 5.0`);
  console.log(`   -> Regret Rate: ${(regretRate * 100).toFixed(1)}%`);

  // 3. Weight Adjustment Logic
  // Hypothesis: If regret is high (> 20%), users are misled by Vibe (Psych).
  // Action: Decrease W_PSYCH, Increase W_MAG (Specs) & W_SAT (Satisfaction).

  const newWeights = { ...HVAM_WEIGHTS };
  let changed = false;

  if (regretRate > 0.20) {
    console.log("❗ High Regret Detected. Adjusting Weights...");

    // Dampen Psych
    newWeights.W_PSYCH = Number((newWeights.W_PSYCH * 0.90).toFixed(3));

    // Boost Mag & Sat
    const delta = (HVAM_WEIGHTS.W_PSYCH - newWeights.W_PSYCH) / 2;
    newWeights.W_MAG = Number((newWeights.W_MAG + delta).toFixed(3));
    newWeights.W_SAT = Number((newWeights.W_SAT + delta).toFixed(3));

    changed = true;
  }

  if (changed) {
    console.log("   -> Old Weights:", HVAM_WEIGHTS);
    console.log("   -> New Weights:", newWeights);

    // 4. Write Config
    const fileContent = `
// HVAM-v4 Global Scoring Weights
// Modified by Truth Loop Analysis on ${new Date().toISOString()}

export const HVAM_WEIGHTS = ${JSON.stringify(newWeights, null, 4)};
`;
    fs.writeFileSync(CONFIG_PATH, fileContent);
    console.log("✅ Config updated successfully.");
  } else {
    console.log("✅ metrics within healthy range. No changes needed.");
  }
}

runAnalysis().catch(console.error);
