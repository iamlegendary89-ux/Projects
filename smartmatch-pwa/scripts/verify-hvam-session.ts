
import fs from "fs";
import path from "path";
import {
  initNewSession,
  updatePosterior,
  selectNextQuestion,
  retrieveCandidates,
  rerank,
} from "../worker/core/hvam-v4"; // V4 Logic
import { PhoneProfile } from "../worker/core/types";

// Load Phone Data
const phonesPath = path.resolve("worker/data/phones.json");
const phonesMap = JSON.parse(fs.readFileSync(phonesPath, "utf-8"));
const phones: PhoneProfile[] = Object.values(phonesMap) as unknown as PhoneProfile[];

async function runSimulation() {
  console.log("🚀 Starting HVAM-v4 Adaptive Simulation...");

  // 1. Start Session
  const sessionId = "sim_v4_test";
  const state = initNewSession(sessionId);
  console.log("[Start] Session Init. Entropy: High. Confidence: 0%");

  // 2. Loop until completion
  let isComplete = false;
  let questionCount = 0;

  while (!isComplete && questionCount < 15) {
    // Get Next Question
    const selection = selectNextQuestion(state);

    if (selection.isComplete || !selection.question) {
      console.log(`[Engine] Stated COMPLETE. Confidence: ${(selection.confidence * 100).toFixed(1)}%`);
      isComplete = true;
      break;
    }

    const q = selection.question;
    console.log(`\n[Q${questionCount + 1}] Asking: "${q.text}" (ID: ${q.id})`);

    // Simulate User Answer (Always pick first option "o1" for consistency, or smart pick?)
    // Let's pick "o2" (Camera / Photography) if available, else o1.
    let option = q.options.find(o => o.text.toLowerCase().includes("camera") || o.text.toLowerCase().includes("photo"));
    if (!option) { option = q.options[0]; }

    // Add null check for option in verify script.
    if (!option) {
      console.warn(`Option not found for question ${q.id}, skipping.`);
      continue;
    }

    console.log(`   -> User Answers: "${option.text}" (ID: ${option.id})`);

    // Update State
    state.answers[q.id] = option.id;
    if (option.impacts) {
      state.mindprint = updatePosterior(state.mindprint, option.impacts);
    }

    // Log Trait Shift (Camera = trait 0)
    console.log(`   -> Trait[0] (Camera) Mu: ${state.mindprint.mu[0]!.toFixed(3)} Var: ${(state.mindprint.var?.[0] ?? 0).toFixed(3)}`);

    questionCount++;
  }

  // 3. Retrieval & Ranking
  console.log("\n[Finish] Retrieving Candidates...");

  // Assemble "User Vector" (Just Mindprint Mu in V4)
  const userVector = { vector: state.mindprint.mu };

  const candidates = retrieveCandidates(userVector, phones, 10);
  console.log(`   -> Retrieved ${candidates.length} candidates by Cosine Similarity.`);

  const mapper = (mu: number[]) => {
    const targets: Record<string, number> = {};
    const ATTRIBUTES = ["Camera", "BatteryEndurance", "Performance", "Display", "SoftwareExperience", "DesignBuild", "LongevityValue"];
    ATTRIBUTES.forEach((attr, i) => {
      targets[attr] = (mu[i] || 0) * 10;
    });
    return targets;
  };

  const results = rerank(state, candidates, mapper);
  const top3 = results.slice(0, 3);

  console.log("\n🏆 Top 3 Recommendations:");
  top3.forEach((r, i) => {
    const phone = phones.find(p => p.id === r.phoneId);
    console.log(`${i + 1}. ${phone?.brand} ${phone?.model}`);
    console.log(`   Score: ${r.score.toFixed(3)} (Psych:${r.components.psych.toFixed(2)} Mag:${r.components.mag.toFixed(2)})`);
  });

  if (results.length === 0) { throw new Error("No results!"); }
  console.log("\n✅ Simulation SUCCESS");
}

runSimulation().catch(e => {
  console.error(e);
  process.exit(1);
});
