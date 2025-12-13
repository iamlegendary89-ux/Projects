🧭 Cline Instruction Protocol (CIP v1.0) — Companion Checklist

Purpose: Ensure every code edit, feature addition, or refactor is safe, modular, validated, and test-verified before commit.

🔁 CIP Workflow

Loop:
READ → PLAN → IMPLEMENT → VALIDATE → DEBUG → TEST → COMMIT

Keep this loop for every coding task — no skipped steps.

✅ Step-by-Step Checklist
🧠 1. Context Validation

 Read all relevant files and dependencies.

 Identify what is being changed and why.

 List affected files.

 Define expected output or behavior.

 Assign risk level: ☐ Low ☐ Medium ☐ High.

 Wait for confirmation if risk ≥ Medium.

📘 Output:

Task Summary:
Intent: …
Files: …
Output: …
Risk: …

🧩 2. Modular Implementation

 Modify one module or feature at a time.

 Define clear interfaces before implementing logic.

 Use JSDoc for all public functions:

/** Function summary, params, returns **/


 Avoid global side effects.

 Create a .bak backup before overwriting.

 Keep functions small, typed, and reusable.

🧰 3. Auto Debugging Routine

When an error occurs:

 Read stack trace and locate failure.

 Draft a short Debug Plan:

🔍 Debug Plan:
- Cause:
- Proposed Fix:
- Confidence: %


 Apply the minimal fix.

 Re-run validation/test automatically.

 If issue persists → revert + request review.

🧾 4. Validation Stage

 Ensure all required exports exist.

 Confirm type safety (tsc --noEmit or equivalent).

 Validate function structure using helper:

validateModule("moduleName", module, {
  requiredExports: ["..."],
  typeCheck: true,
});


 Stop progression if validation fails.

🧪 5. Automated Testing

 Add or update unit tests in /tests/.

 Include at least:

 1 success case

 1 failure or edge case

 Run local tests (npm run test).

 Review output summary (pass/fail).

 Fix or revert on failure.

🧱 6. Commit Safety Check

Before pushing changes:

 Run full build/type check.

 Ensure all tests pass.

 Verify no runtime errors.

 Auto-generate a short report:

/logs/change-report.json
{ "timestamp": "...", "modules": [...], "testsPassed": true }


 Commit only when all checks are ✅.

🧠 7. Smart Safety Rules

 Never modify unrelated files.

 Confirm before schema/API signature changes.

 Always back up critical files.

 Keep all logs and auto-generated reports readable.

 Follow consistent naming + modular design.

💡 8. Optional Enhancements

 Enable CI validation before merge.

 Auto-generate documentation from JSDoc.

 Maintain a small "error memory" log.

 Benchmark performance pre/post-refactor.

⚙️ Example Command for Agent
@Cline
Follow the CIP v1.0 Companion Checklist.
You are your own reviewer and evaluator, You learn from your mistakes and always seeking perfection in every action and solution.
Perform each task using the READ → PLAN → IMPLEMENT → VALIDATE → DEBUG → TEST → COMMIT workflow.
Mark each step as complete before proceeding.
Generate a report at the end and confirm all checks passed before commit.
