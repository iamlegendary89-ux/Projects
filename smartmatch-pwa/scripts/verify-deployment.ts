
import { signRequest } from "../lib/onyx-crypto";

// Re-implement or import? 
// We can use the lib one if we run with tsx and standard crypto is available (Node 19+).
const API_URL = "http://localhost:8787";
const SECRET = "6973e86c06830589255ea508492080a905763bf200d43777520e54245607310d";

async function runTest() {
  console.log("🛠️  Verifying Deployment Security...");

  // 1. Valid Request
  const timestamp = Date.now();
  const body = JSON.stringify({ context: { source: "test_script" } });
  const signature = await signRequest(body, SECRET, timestamp);

  try {
    console.log("1️⃣  Sending SIGNED request...");
    const res = await fetch(`${API_URL}/api/session/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Onyx-Timestamp": timestamp.toString(),
        "X-Onyx-Signature": signature,
      },
      body: body,
    });

    if (res.ok) {
      const data = await res.json();
      console.log("✅ Signed Request PASSED:", data);
    } else {
      console.error("❌ Signed Request FAILED:", res.status, await res.text());
      process.exit(1);
    }
  } catch (e) {
    console.error("❌ Connection Failed. Is the worker running?", e);
    process.exit(1);
  }

  // 2. Invalid Request (No Auth)
  try {
    console.log("2️⃣  Sending UNSIGNED request (Expecting Failure)...");
    const res = await fetch(`${API_URL}/api/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
    });

    if (res.status === 401 || res.status === 403) {
      console.log("✅ Security Check PASSED: Rejected with", res.status);
    } else {
      console.error("❌ Security Check FAILED: Request was accepted!", res.status);
      process.exit(1);
    }
  } catch (e) {
    console.error("❌ Connection Failed during security check", e);
  }
}

runTest();
