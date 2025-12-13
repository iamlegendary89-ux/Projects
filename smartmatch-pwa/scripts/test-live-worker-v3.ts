
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load .env.local
const envLocal = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
const envConfig = dotenv.parse(envLocal);

// Use Live URL
const API_BASE = envConfig.NEXT_PUBLIC_ONYX_API_URL || "https://onyx-engine.smartmatch-prod.workers.dev";
const API_SECRET = envConfig.NEXT_PUBLIC_ONYX_API_SECRET || "demo-secret";

async function verifyLive() {
  console.log(`🔌 Connecting to Live Engine: ${API_BASE}`);

  // Mimic OnyxClient.startSession behavior
  const context = {};
  const body = JSON.stringify({ context });

  const timestamp = Date.now().toString();

  // Sign
  const crypto = await import("crypto");
  const hmac = crypto.createHmac("sha256", API_SECRET);
  hmac.update(timestamp + body);
  const signature = hmac.digest("hex");

  console.log(`🔑 Using provided Secret: ${API_SECRET.slice(0, 5)}...`);

  try {
    const res = await fetch(`${API_BASE}/api/session/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Onyx-Timestamp": timestamp,
        "X-Onyx-Signature": signature,
      },
      body: body,
    });

    if (!res.ok) {
      console.error(`❌ Request Failed: ${res.status} ${res.statusText}`);
      console.error(await res.text());
      return;
    }

    const data = await res.json() as any;
    console.log("✅ Live Session Started!");
    console.log(`   Session ID: ${data.sessionId}`);
    console.log(`   First Question ID: ${data.nextQuestionId}`);

    if (data.nextQuestionId === "q01") {
      console.log("🎉 SUCCESS: Onyx V5 Model is LIVE.");
    } else if (data.nextQuestionId === "q_01") {
      console.warn("⚠️ FAILURE: Onyx V4 (Old) is still active.");
    }

  } catch (e: any) {
    console.error("❌ Network/Script Error:", e.message);
  }
}

verifyLive();
