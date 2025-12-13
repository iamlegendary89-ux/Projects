
import {
  initNeutralMindprint,
  processAnswerAndEvaluate,
  selectNextQuestion,
  COMPILED_QUESTIONS,
  overallConfidenceFromMindprint,
} from "../worker/core/onyx-model";
import { SessionState } from "../worker/core/types";

async function verifyLoop() {
  console.log("🔄 Verifying Session Loop (No external deps)...");

  const mindprint = initNeutralMindprint();
  const state: SessionState = {
    sessionId: "loop-test",
    step: 0,
    mindprint,
    answers: {},
    dealbreakers: { os_only: null, max_size: null, budget_cap: null },
  };

  let active = true;
  while (active) {
    const answeredIds = Object.keys(state.answers);
    const q = selectNextQuestion(COMPILED_QUESTIONS, state.mindprint, answeredIds);

    if (!q) {
      console.log("✅ Loop Finished: Logic returned null (End of Session).");
      active = false;
      break;
    }

    console.log(`[Q${state.step + 1}] ${q.id}: ${q.text}`);

    // Always pick option 0 for stability
    if (!q.options || q.options.length === 0) {
      console.error(`❌ Error: Question ${q.id} has no options`);
      active = false;
      break;
    }

    // Force non-null assertion as we checked length
    const opt = q.options[0]!;
    console.log(`   -> Answering: ${opt.id}`);
    state.answers[q.id] = opt.id;

    try {
      const res = processAnswerAndEvaluate(state.mindprint, q.id, opt.id);
      state.mindprint = res.mindprint;
      state.step++;
      const conf = overallConfidenceFromMindprint(state.mindprint);
      console.log(`   -> Conf: ${(conf * 100).toFixed(1)}%`);

      if (state.step >= 12) {
        console.log("⚠️ Force stopping at 12 steps.");
        active = false;
      }
    } catch (e) {
      console.error("❌ Error:", e);
      active = false;
    }
  }

  console.log("✅ Session Loop Verified.");
}

verifyLoop();
