
import {
  initNeutralMindprint,
  selectNextQuestion,
  processAnswerAndEvaluate,
  COMPILED_QUESTIONS,
} from "../worker/core/onyx-model";

async function debug() {
  console.log("--- Debugging Onyx V5 Model ---");

  // 1. Init
  console.log("1. Initializing Mindprint...");
  const mindprint = initNeutralMindprint();
  console.log("   Mindprint Initialized:", {
    muLength: mindprint.mu.length,
    sigmaLength: mindprint.sigma.length,
  });

  // 2. Select First Question
  console.log("\n2. Selecting First Question (0 answered)...");
  try {
    const q1 = selectNextQuestion(COMPILED_QUESTIONS, mindprint, []);
    if (!q1) {
      console.error("❌ Error: No question selected for start of session!");
    } else {
      console.log(`✅ Selected Q1: ${q1.id} - "${q1.text}"`);
      console.log(`   Options count: ${q1.options.length}`);
    }

    if (q1) {
      // 3. Answer Q1
      const opt = q1.options[0];
      if (!opt) { console.error("No option!"); return; }
      console.log(`\n3. Answering with Option: ${opt.id} (${opt.label})`);

      const result = processAnswerAndEvaluate(mindprint, q1.id, opt.id);
      console.log("✅ Answer Processed.");
      console.log("   New Confidence:", result.confidence.toFixed(4));

      // 4. Select Q2
      console.log("\n4. Selecting Next Question (1 answered)...");
      const q2 = selectNextQuestion(COMPILED_QUESTIONS, result.mindprint, [q1.id]);
      if (q2) {
        console.log(`✅ Selected Q2: ${q2.id} - "${q2.text}"`);
      } else {
        console.log("ℹ️ No Q2 selected (Confidence high or done?)");
      }
    }

  } catch (error) {
    console.error("❌ CRITICAL RUNTIME ERROR:", error);
  }
}

debug();
