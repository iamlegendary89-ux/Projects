import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Configuration
const CONFIG = {
  PATHS: {
    DATA: path.join(process.cwd(), "data"),
    LOGS: path.join(process.cwd(), "logs"),
    PHONES_FILE: path.join(process.cwd(), "data", "processed-phones.json"),
  },
  THRESHOLDS: {
    FRESHNESS_HOURS: 2,
  },
  RETRY: {
    MAX_ATTEMPTS: 2,
    DELAY_MS: 3000,
  },
};

// Logger with timestamps
const logger = {
  info: (msg: string) => console.log(`[${time()}] ℹ️  ${msg}`),
  success: (msg: string) => console.log(`[${time()}] ✅ ${msg}`),
  warn: (msg: string) => console.log(`[${time()}] ⚠️  ${msg}`),
  error: (msg: string, err?: Error) => {
    console.error(`[${time()}] ❌ ${msg}`);
    if (err?.stack) { console.error(err.stack); }
  },
  header: (msg: string) => console.log(`\n${"═".repeat(60)}\n  ${msg}\n${"═".repeat(60)}\n`),
};

function time(): string {
  return new Date().toISOString().slice(11, 19);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run command with retry
async function runStep(name: string, command: string, sectionName: string): Promise<void> {
  logger.header(sectionName);
  const start = Date.now();

  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(CONFIG.PATHS.LOGS, `${safeName}_${timestamp}.log`);

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= CONFIG.RETRY.MAX_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) {
        logger.warn(`Retry ${attempt}/${CONFIG.RETRY.MAX_ATTEMPTS} for ${name}...`);
        await sleep(CONFIG.RETRY.DELAY_MS);
      }

      logger.info(`Starting ${name}...`);
      logger.info(`> Log: ${logFile}`);

      const logFd = fs.openSync(logFile, "w");
      try {
        execSync(command, { stdio: ["ignore", logFd, logFd] });
      } finally {
        fs.closeSync(logFd);
      }

      // Show last 5 lines
      const content = fs.readFileSync(logFile, "utf-8");
      console.log(content.split("\n").slice(-5).join("\n"));

      const duration = ((Date.now() - start) / 1000).toFixed(1);
      logger.success(`${name} completed in ${duration}s`);
      return; // Success!

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.error(`${name} failed (attempt ${attempt})`, lastError);
    }
  }

  // All retries exhausted
  logger.error(`${name} failed after ${CONFIG.RETRY.MAX_ATTEMPTS} attempts! See: ${logFile}`);
  throw lastError;
}

// Check git file age
function getFileAgeHours(filePath: string): number {
  try {
    if (!fs.existsSync(filePath)) { return 999; }
    const timestamp = execSync(`git log -1 --format=%ct "${filePath}"`, { encoding: "utf-8" }).trim();
    if (!timestamp) { return 999; }
    return (Date.now() - parseInt(timestamp, 10) * 1000) / (1000 * 60 * 60);
  } catch {
    logger.warn(`Could not check git history for ${filePath}, assuming stale.`);
    return 999;
  }
}

async function main() {
  const pipelineStart = Date.now();
  let stepsCompleted = 0;
  const totalSteps = 6;

  try {
    logger.header("SMARTMATCH PIPELINE");
    logger.info("Initializing...");

    // Create logs directory
    fs.mkdirSync(CONFIG.PATHS.LOGS, { recursive: true });

    // Log cache sizes for observability
    const caches = ["archive_failures.json", "extraction_failures_cache.json", "no_snapshots_cache.json"];
    for (const cache of caches) {
      try {
        const size = fs.statSync(path.join(CONFIG.PATHS.DATA, cache)).size;
        logger.info(`Cache: ${cache} (${(size / 1024).toFixed(1)}KB)`);
      } catch { /* cache doesn't exist yet */ }
    }

    // STEP 1: DISCOVERY
    const phonesAge = getFileAgeHours(CONFIG.PATHS.PHONES_FILE);
    logger.info(`Data age: ${phonesAge.toFixed(1)}h`);

    if (phonesAge < CONFIG.THRESHOLDS.FRESHNESS_HOURS) {
      logger.success(`Data fresh (<${CONFIG.THRESHOLDS.FRESHNESS_HOURS}h), skipping Discovery`);
      stepsCompleted++;
    } else {
      await runStep("Discovery", "npx tsx scripts/discovery.ts", "STEP 1: DISCOVERY");
      stepsCompleted++;
    }

    // STEP 2: ENRICHMENT
    await runStep("Enrichment", "npx tsx scripts/enrichment.ts", "STEP 2: ENRICHMENT");
    stepsCompleted++;

    // STEP 3: OSET
    await runStep("OSET", "npx tsx scripts/OSET.ts", "STEP 3: OSET TRUTH CORRECTION");
    stepsCompleted++;

    // STEP 4: SYNC
    await runStep("Sync", "npx tsx scripts/sync.ts --export", "STEP 4: SYNC & EXPORT");
    stepsCompleted++;

    // STEP 5: REPORT
    await runStep("Report", "npx tsx scripts/generate-report.ts", "STEP 5: REPORT");
    stepsCompleted++;

    // STEP 6: CLEANUP (non-critical)
    try {
      await runStep("Cleanup", "npx tsx scripts/clean-logs.ts", "STEP 6: CLEANUP");
    } catch {
      logger.warn("Cleanup failed (non-critical)");
    }
    stepsCompleted++;

    // Success summary
    const totalTime = ((Date.now() - pipelineStart) / 1000).toFixed(1);
    logger.header("PIPELINE COMPLETE");
    logger.success(`All ${totalSteps} steps completed in ${totalTime}s`);

  } catch (error) {
    const totalTime = ((Date.now() - pipelineStart) / 1000).toFixed(1);
    logger.header("PIPELINE FAILED");
    logger.error(`Failed at step ${stepsCompleted + 1}/${totalSteps} after ${totalTime}s`, error instanceof Error ? error : undefined);
    process.exit(1);
  }
}

main();
