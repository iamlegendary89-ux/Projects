
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const API_URL = process.env.NEXT_PUBLIC_ONYX_API_URL;


async function main() {
  console.log(`Testing Worker at: ${API_URL}`);

  // 1. Test Root
  try {
    const res = await fetch(`${API_URL}`);
    console.log(`Root Status: ${res.status}`);
    console.log(`Root Text: ${await res.text()}`);
  } catch (e: any) {
    console.error("Root Fetch Failed:", e.message);
  }

  // 2. Test Session Start (needs crypto, but maybe we can just check if it rejects us with 401 instead of 404/500)
  try {
    const res = await fetch(`${API_URL}/api/session/start`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    console.log(`Session Start Status: ${res.status}`); // Expect 401 (Missing Headers) or 200
    console.log(`Session Start Text: ${await res.text()}`);
  } catch (e: any) {
    console.error("Session Start Fetch Failed:", e.message);
  }
}

main();
