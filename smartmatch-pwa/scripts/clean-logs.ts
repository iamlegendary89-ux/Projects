
import { readdir, unlink, stat } from "fs/promises";
import { join } from "path";

const DIRECTORIES = [
  "logs",
  "discovery-logs",
  "enrichment-logs",
  "oset-logs",
  "sync-logs",
];

const KEEP_count = 5;

// Types of logs to identify prefixes
const LOG_TYPES = ["discovery", "enrichment", "oset", "sync"];

// LZFOF: Pre-compiled timestamp regex
const TIMESTAMP_RE = /(\d{4}-\d{2}-\d{2}T\d{2}[-:]\d{2}[-:]\d{2})/;

async function cleanDirectory(dir: string) {
  try {
    const files = await readdir(dir).catch(() => []);
    if (files.length === 0) { return; }

    console.log(`\n📂 Scanning ${dir}... (${files.length} files)`);

    // Group files by type
    const groups: Record<string, { name: string, path: string, time: string, mtime: number }[]> = {};

    for (const type of LOG_TYPES) {
      groups[type] = [];
    }
    groups["other"] = [];

    for (const f of files) {
      // Ignore non-log files/dirs (simple check)
      if (!f.endsWith(".log") && !f.endsWith(".txt") && !f.endsWith(".jsonl")) { continue; }

      const lower = f.toLowerCase();
      let matchedType = "other";
      for (const type of LOG_TYPES) {
        if (lower.startsWith(type)) {
          matchedType = type;
          break;
        }
      }

      // Extract timestamp for sorting - LZFOF: use pre-compiled regex
      const timeMatch = f.match(TIMESTAMP_RE);
      const timeStr = timeMatch ? timeMatch[0] : "";

      // Get stats for fallback mtime
      let mtime = 0;
      try {
        const s = await stat(join(dir, f));
        mtime = s.mtimeMs || 0;
      } catch {
        mtime = 0;
      }

      // TS check: ensure group exists
      const targetGroup = groups[matchedType];
      if (targetGroup) {
        targetGroup.push({
          name: f,
          path: join(dir, f),
          time: timeStr,
          mtime: mtime,
        });
      }
    }

    // Process each group
    let deletedCount = 0;
    let keptCount = 0;

    for (const type of Object.keys(groups)) {
      const list = groups[type];
      // TS Fix: Ensure list is defined
      if (!list || list.length === 0) { continue; }

      // Sort: Newest first
      // Criteria: 1. Timestamp string (descending) 2. mtime (descending)
      list.sort((a, b) => {
        if (a.time && b.time) { return b.time.localeCompare(a.time); }
        if (a.time) { return -1; } // a has time, b doesn't -> a is newer
        if (b.time) { return 1; }
        return b.mtime - a.mtime;
      });

      // Keep top N
      const toKeep = list.slice(0, KEEP_count);
      const toDelete = list.slice(KEEP_count);

      keptCount += toKeep.length;

      for (const file of toDelete) {
        await unlink(file.path);
        deletedCount++;
        // console.log(`   🗑️ Deleted ${file.name}`);
      }

      if (toDelete.length > 0) {
        console.log(`   🔸 [${type}] Kept ${toKeep.length}, Deleted ${toDelete.length}`);
      } else {
        console.log(`   🔹 [${type}] Kept ${toKeep.length} (clean)`);
      }
    }

    if (deletedCount > 0) {
      console.log(`   ✅ Removed ${deletedCount} old files from ${dir}`);
    } else {
      console.log("   ✅ Directory clean.");
    }

  } catch (err) {
    console.warn(`Error processing ${dir}:`, err);
  }
}

async function main() {
  console.log("🧹 Starting Log Cleanup...");
  console.log(`   Retention Policy: Keep last ${KEEP_count} files per type.\n`);

  for (const dir of DIRECTORIES) {
    await cleanDirectory(dir);
  }

  console.log("\n✨ Cleanup Complete.");
}

main().catch(console.error);
