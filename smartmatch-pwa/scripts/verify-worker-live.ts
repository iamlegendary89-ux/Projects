
import chalk from "chalk";

const API_OD = "https://onyx-engine.smartmatch-prod.workers.dev";
// WAIT: The prod secret might be different. I must check .env.local again
// .env.local says: NEXT_PUBLIC_ONYX_API_SECRET=6973e86c...
// But deployment log said "Your worker has access to...".
// I will use the one from .env.local.

const KEY_FROM_ENV = "6973e86c06830589255ea508492080a905763bf200d43777520e54245607310d";

async function signRequest(body: string, secret: string, timestamp: number) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${timestamp}.${body}`),
  );
  return Buffer.from(sig).toString("hex");
}

async function apiCall(endpoint: string, body: any) {
  const url = `${API_OD}${endpoint}`;
  const timestamp = Date.now();
  const payload = JSON.stringify(body);
  const signature = await signRequest(payload, KEY_FROM_ENV, timestamp);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Onyx-Timestamp": timestamp.toString(),
        "X-Onyx-Signature": signature,
      },
      body: payload,
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${txt}`);
    }
    return await res.json();
  } catch (e) {
    console.error(chalk.red(`API Call Failed [${endpoint}]:`), e);
    throw e;
  }
}

async function run() {
  console.log(chalk.cyan("Starting Worker Verification..."));

  // 1. Start Session
  console.log(chalk.yellow("1. Starting Session..."));
  const startRes = await apiCall("/api/session/start", { context: { source: "cli-test" } });
  console.log(chalk.green("Session Started:"), startRes.sessionId);
  const sessionId = startRes.sessionId;

  // 2. Answer a few questions (Simulating a user)
  // q01 - Balance
  console.log(chalk.yellow("2. Answering Q01..."));
  await apiCall("/api/session/answer", { sessionId, questionId: "q01", optionId: "q01_o1" }); // Balance

  // q02 - Photography
  console.log(chalk.yellow("2. Answering Q02..."));
  await apiCall("/api/session/answer", { sessionId, questionId: "q02", optionId: "q02_o2" });

  // q17 - Force iOS (Dealbreaker)
  console.log(chalk.yellow("2. Answering Q17 (iOS)..."));
  await apiCall("/api/session/answer", { sessionId, questionId: "q17", optionId: "q17_o1" });

  // 3. Finish Session
  console.log(chalk.yellow("3. Finishing Session..."));
  const finishRes = await apiCall("/api/session/finish", { sessionId });

  console.log(chalk.green("Session Finished Successfully!"));
  console.log("Recs:", finishRes.recommendations.length);
  console.log("Algorithm:", finishRes.meta.algorithm);
  console.log("Primary Archetype:", finishRes.meta.primaryArchetype || chalk.red("MISSING"));

  if (finishRes.recommendations.length > 0) {
    const first = finishRes.recommendations[0];
    console.log("Top Match:", first.phoneId);
    console.log("Regret Data:", first.regretData ? chalk.green("PRESENT") : chalk.red("MISSING"));
  }
}

run().catch(err => console.error(chalk.red("Script Failed"), err));
