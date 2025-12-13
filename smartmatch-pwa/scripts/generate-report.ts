
import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";

// LZFOF: Pre-compiled regex patterns
const TIMESTAMP_RE = /(\d{4}-\d{2}-\d{2}T\d{2}[-:]\d{2}[-:]\d{2})/;
const PROCESSED_RE = /\[Processed: ([^\]]+)\]/;
const NEWLINE_RE = /\n/g;

async function main() {
  console.log("📊 Generating Unified Pipeline Report...");

  const report = [];
  const fullLog = [];

  report.push("# 🚀 SmartMatch Pipeline Report");
  report.push(`**Run Date:** ${new Date().toLocaleString()}`);
  report.push("**Status:** ✅ Workflow Completed");
  report.push("");

  // 1. DISCOVERY SUMMARY
  report.push("## 🔍 Discovery Phase");
  try {
    const discoveryLogs = await getLatestLogContent("discovery-logs", "discovery");
    const skipped = (discoveryLogs.match(/skipping/gi) || []).length;
    const processed = (discoveryLogs.match(/processing/gi) || []).length;
    report.push(`- **Items Processed:** ${processed}`);
    report.push(`- **Items Cached/Skipped:** ${skipped}`);
    fullLog.push(`\n=== DISCOVERY LOGS ===\n${discoveryLogs}`);
  } catch (e) {
    console.error("Error reading discovery logs:", e);
    report.push("- *Log data unavailable*");
  }

  // 2. ENRICHMENT SUMMARY
  report.push("\n## 🧠 Enrichment Phase");
  try {
    // Try fallback report md first
    let enrichmentSummary = "";
    try {
      enrichmentSummary = await readFile("enrichment-report.md", "utf8");
      const lines = enrichmentSummary.split("\n").filter(l => l.startsWith("-"));
      if (lines.length > 0) { report.push(...lines); }
      else { throw new Error("Empty report"); }
    } catch {
      // Parse LOGS for accurate count
      const logs = await getLatestLogContent("enrichment-logs", "enrichment");
      let enrichedCount = 0;
      const uniquePhones = new Set<string>();
      let alreadyUpToDate = false;

      const logLines = logs.split("\n");
      for (const line of logLines) {
        // Check simple text marker
        if (line.includes("All phones already enriched")) {
          alreadyUpToDate = true;
        }

        // Check for injected Processed marker from getLatestLogContent - LZFOF: use pre-compiled
        const match = line.match(PROCESSED_RE);
        if (match && match[1]) {
          uniquePhones.add(match[1].trim());
        }
      }
      enrichedCount = uniquePhones.size;

      if (alreadyUpToDate && enrichedCount === 0) {
        report.push("- **Phones Enriched:** 0 (All already up-to-date)");
      } else {
        report.push(`- **Phones Enriched:** ${enrichedCount}`);
      }

      fullLog.push(`\n=== ENRICHMENT LOGS ===\n${logs}`);
    }
  } catch (e) {
    console.error("Error reading enrichment logs:", e);
    report.push("- *Data unavailable*");
  }

  // 3. OSET SUMMARY
  report.push("\n## 🎯 OSET Phase");
  try {
    const logs = await getLatestLogContent("oset-logs", "oset");
    const corrections = (logs.match(/Correction applied/g) || []).length;
    report.push(`- **Truth Corrections Applied:** ${corrections}`);
    fullLog.push(`\n=== OSET LOGS ===\n${logs}`);
  } catch (e) {
    console.error("Error reading oset logs:", e);
    report.push("- *Log data unavailable*");
  }

  // 4. SYNC SUMMARY
  report.push("\n## 🔄 Sync Phase");
  try {
    const logs = await getLatestLogContent("sync-logs", "sync");
    const upserts = (logs.match(/Upserted/g) || []).length;
    report.push(`- **Database Records Updated:** ${upserts}`);
    fullLog.push(`\n=== SYNC LOGS ===\n${logs}`);
  } catch (e) {
    console.error("Error reading sync logs:", e);
    report.push("- *Log data unavailable*");
  }

  // WRITE ARTIFACTS
  await writeFile("PIPELINE_REPORT.md", report.join("\n"));
  await writeFile("PIPELINE_FULL_LOGS.txt", fullLog.join("\n"));

  console.log("✅ Report generated: PIPELINE_REPORT.md");
  console.log("✅ Logs consolidated: PIPELINE_FULL_LOGS.txt");
}

async function getLatestLogContent(primaryDir: string, searchPattern: string): Promise<string> {
  const candidates: { path: string; name: string; sortKey: string }[] = [];

  // Helper to scan a directory and collect valid files
  const scanDir = async (dir: string) => {
    try {
      const files = await readdir(dir);
      // console.log(`Scanning ${dir}... Found ${files.length} files.`); 
      for (const f of files) {
        if (f.toLowerCase().includes(searchPattern.toLowerCase()) &&
          (f.endsWith(".log") || f.endsWith(".txt") || f.endsWith(".jsonl"))) {

          // Extract timestamp priority - LZFOF: use pre-compiled
          const timeMatch = f.match(TIMESTAMP_RE);
          const sortKey = timeMatch ? timeMatch[0] : "";

          candidates.push({ path: join(dir, f), name: f, sortKey });
        }
      }
    } catch (err) {
      // Ignore
    }
  };

  // Scan both locations
  await scanDir(primaryDir);
  if (primaryDir !== "logs") {
    await scanDir("logs");
  }

  // CHECK IF EMPTY -> FIX TS UNDEFINED
  if (candidates.length === 0) {
    console.warn(`No logs found matching '${searchPattern}' in ${primaryDir} or logs/`);
    return "";
  }

  // Sort by timestamp
  candidates.sort((a, b) => {
    if (a.sortKey === "" && b.sortKey === "") { return a.name.localeCompare(b.name); }
    if (a.sortKey === "") { return -1; } // No timestamp = older
    if (b.sortKey === "") { return 1; }
    return a.sortKey.localeCompare(b.sortKey);
  });

  // Pick the latest
  // Safely check length or just access, but TS needs assertion or check if I set explicit type strictness.
  // We already checked candidates.length === 0 above, so undefined is impossible unless threading issues (not here).
  const latest = candidates[candidates.length - 1];

  // Explicit null check to satisfy TS pedantic mode
  if (!latest) { return ""; }

  console.log(`Analyzing LATEST log file for '${searchPattern}': ${latest.path} (Key: ${latest.sortKey})`);

  // Read and Parse
  try {
    const content = await readFile(latest.path, "utf8");
    const lines = content.split("\n");
    const allLines: string[] = [];

    for (const line of lines) {
      if (!line.trim()) { continue; }
      try {
        if (line.trim().startsWith("{")) {
          const entry = JSON.parse(line);
          if (entry.timestamp && entry.level && entry.message) {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            let formatted = `[${time}] ${entry.level.toUpperCase().padEnd(5)}: ${entry.message}`;

            // Inject Processed ID for easier parsing in main()
            if (entry.message === "Enrichment complete" && (entry.meta?.phone || entry.meta?.model)) {
              formatted += ` [Processed: ${entry.meta.phone || entry.meta.model}]`;
            }

            if (entry.data) {
              const dataStr = JSON.stringify(entry.data, null, 2).replace(NEWLINE_RE, "\n       ");
              formatted += `\n       ${dataStr}`;
            } else if (entry.meta) {
              const dataStr = JSON.stringify(entry.meta, null, 2).replace(NEWLINE_RE, "\n       ");
              formatted += `\n       ${dataStr}`;
            }
            allLines.push(formatted);
            continue;
          }
        }
      } catch { /* parse failure */ }

      // Filter noise
      if (line.includes("scrape_duration_seconds")) { continue; }
      if (line.includes("Action: upsert")) { continue; }

      allLines.push(line);
    }
    return allLines.join("\n");
  } catch (err) {
    console.error(`Error reading ${latest.path}:`, err);
    return "";
  }
}

main().catch(console.error);
