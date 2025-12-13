
import "dotenv/config";

// Localhost URL
const BASE_URL = "http://localhost:3000";

async function testLocalhost() {
  console.log(`🔌 Connecting to ${BASE_URL}...`);

  // 1. Session Start
  try {
    // Needs Signature?
    // Check index.ts: withAuth middleware applies to /api/*
    // It requires X-Onyx-Signature.
    // I need to sign the request using the secret.
    // Local env secret: "demo-secret" usually or from .env.local

    // However, middleware checks env.ONYX_API_SECRET.
    // In local nextjs, it reads .env.local.
    // checking .env.local... 
    // NEXT_PUBLIC_ONYX_API_SECRET=6973e8...
    // But the middleware code says: env.ONYX_API_SECRET || "demo-secret".
    // Locally, process.env.ONYX_API_SECRET might be distinct from NEXT_PUBLIC_.

    // I will try fetching without auth first? No, middleware is precise.
    // I will use crypto to sign.

    const crypto = await import("crypto");
    const API_SECRET = process.env.NEXT_PUBLIC_ONYX_API_SECRET || "demo-secret";

    const timestamp = Date.now().toString();
    const body = "";
    const hmac = crypto.createHmac("sha256", API_SECRET);
    hmac.update(timestamp + body);
    const signature = hmac.digest("hex");

    console.log(`🔑 Using Secret: ${API_SECRET.slice(0, 5)}...`);

    const res = await fetch(`${BASE_URL}/api/session/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Onyx-Timestamp": timestamp,
        "X-Onyx-Signature": signature,
      },
    });

    if (!res.ok) {
      console.error(`❌ Start Failed: ${res.status} ${res.statusText}`);
      console.error(await res.text());
      return;
    }

    const data = await res.json() as any;
    console.log("✅ Session Started!");
    console.log(`   Session ID: ${data.sessionId}`);
    console.log(`   First Question ID: ${data.nextQuestionId}`);

    if (data.nextQuestionId === "q01") {
      console.log("\n🎉 SUCCESS: Onyx V5 Model is ACTIVE on Localhost.");
    } else if (data.nextQuestionId === "q_01") {
      console.warn("\n⚠️ WARNING: Old V4 Model is ACTIVE. Server needs restart.");
    } else {
      console.log(`ℹ️ Unknown Question ID: ${data.nextQuestionId}`);
    }

  } catch (e: any) {
    console.error("❌ Connection Error:", e.message);
    if (e.cause) {console.error(e.cause);}
  }
}

testLocalhost();
