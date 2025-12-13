
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

// Load Env
dotenv.config({ path: ".env.local" });

// Load Phones for IDs
const phonesPath = path.resolve("worker/data/phones.json");
const phonesMap = JSON.parse(fs.readFileSync(phonesPath, "utf-8"));
const phoneIds = Object.keys(phonesMap);

const sbUrl = process.env.SUPABASE_URL;
const sbKey = process.env.SUPABASE_SERVICE_KEY;

if (!sbUrl || !sbKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(sbUrl, sbKey);

async function simulateFeedback() {
  console.log("🧪 Starting Feedback Simulation...");

  // 0. Test Connection
  console.log("   -> Testing Supabase Connection...");
  const { error: testError } = await supabase.from("onyx_sessions").select("count").limit(1);

  if (testError) {
    console.error("❌ Connection Test Failed:", JSON.stringify(testError, null, 2));
    // If table doesn't exist, we might get 404 or 42P01
  } else {
    console.log("✅ Connection OK. Session Count check passed.");
  }

  const feedbackBatch = [];
  console.log("   -> Generating 20 feedback entries...");

  for (let i = 0; i < 20; i++) {
    const pid = phoneIds[Math.floor(Math.random() * phoneIds.length)];
    const sid = uuidv4();

    // 1. Create Dummy Session
    const { error: sessError } = await supabase.from("onyx_sessions").insert({
      session_id: sid,
      created_at: new Date().toISOString(),
    });
    if (sessError) { console.error("Session Insert Error:", sessError); }

    // 2. Add Feedback
    feedbackBatch.push({
      session_id: sid,
      phone_id: pid,
      rating: 2,
      regret: true,
      notes: "Regret buying this based on hype. Specs are bad.",
      created_at: new Date().toISOString(),
    });
  }

  // Insert
  console.log("   -> Attempting INSERT...");
  const { data, error } = await supabase.from("onyx_feedback").insert(feedbackBatch).select();

  if (error) {
    console.error("❌ INSERT Error:", JSON.stringify(error, null, 2));
  } else {
    console.log(`✅ Successfully inserted ${data?.length} mock feedback records.`);
  }
}

simulateFeedback().then(() => {
  console.log("Script finished logic. Waiting 5s to ensure flush...");
  setTimeout(() => {
    console.log("Forced Exit.");
    process.exit(0);
  }, 5000);
}).catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
