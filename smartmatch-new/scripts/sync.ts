#!/usr/bin/env node

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { promises as fs } from "fs";
import { resolve, join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import pLimit from "p-limit";
import { z } from "zod";
// Telemetry commented out - using no-op stubs
// import {
//   initializeTelemetry,
//   shutdownTelemetry,
//   startSpan,
//   endSpan,
//   recordWorkflowRun,
//   recordWorkflowStep,
//   recordDbUpsert,
// } from "../lib/telemetry/telemetry.js";

// No-op telemetry stubs
const initializeTelemetry = async () => { };
const shutdownTelemetry = async () => { };
const startSpan = () => ({});
const endSpan = () => { };
const recordWorkflowRun = () => { };
const recordWorkflowStep = () => { };
const recordDbUpsert = () => { };


// -----------------------------------------------------------------------------
// Configuration & Constants
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const EnvSchema = z.object({
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
  SUPABASE_SERVICE_KEY: z.string().min(1, "SUPABASE_SERVICE_KEY is required"),
});

const envParse = EnvSchema.safeParse(process.env);

if (!envParse.success) {
  console.error("❌ Invalid environment variables:", envParse.error.format());
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = envParse.data;

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CONFIG = {
  PROCESSED_PHONES_JSON: resolve(__dirname, "../data/processed-phones.json"),
  PROCESSED_CONTENT_DIR: resolve(__dirname, "../data/processed_content"),
  EXPORTS_DIR: resolve(__dirname, "../data/Supabase"),
  IMAGES_SUBDIR: "images",
  BATCH_DB_UPSERT: 50,
  IMAGE_UPLOAD_CONCURRENCY: 4,
  STORAGE_BUCKET: "phone-images",
} as const;

// -----------------------------------------------------------------------------
// Types & Schemas
// -----------------------------------------------------------------------------

const ProcessedPhoneEntrySchema = z.object({
  phoneId: z.string(),
  brand: z.string(),
  model: z.string(),
  filename: z.string(),
  lastProcessedAt: z.string().optional(),
  enrichmentStatus: z.string().optional(),
  factsVersion: z.string().optional(),
});

type ProcessedPhoneEntry = z.infer<typeof ProcessedPhoneEntrySchema>;

const RegistrySchema = z.object({
  phones: z.record(z.string(), ProcessedPhoneEntrySchema),
});

const AttributeScoreSchema = z.object({
  score: z.number().nullable(),
  explanation: z.string(),
});

const EnrichedDataSchema = z.object({
  brand: z.string(),
  model: z.string(),
  releaseDate: z.string().optional(),
  overallScore: z.number().nullable().optional(),
  originalOverallScore: z.number().optional(),
  category: z.string().optional(),
  onePageSummary: z.string().optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  attributes: z.record(z.string(), AttributeScoreSchema).optional(),
  originalAttributes: z.record(z.string(), AttributeScoreSchema).optional(),
  metadata: z.object({
    confidence: z.number().optional(),
    processingTimeMs: z.number().optional(),
  }).optional(),
});

type EnrichedData = z.infer<typeof EnrichedDataSchema>;

interface DbRow {
  phone_id: string;
  brand: string;
  model: string;
  release_date: string | null;
  overall_score: number | null;
  category: string | null;
  summary: string | null;
  pros: string | null;
  cons: string | null;
  confidence: number | null;
  processing_time_ms: number | null;
  last_processed_at: string;
  enrichment_status: string;
  facts_version: string;
  full_data: EnrichedData;
  updated_at: string;
  [key: string]: unknown; // For dynamic attribute columns
}

// LZFOF: ATTR_MAP removed - using direct property access in buildDbRow for speed

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

function info(...args: unknown[]): void {
  console.log("ℹ️", ...args);
}

function warn(...args: unknown[]): void {
  console.warn("⚠️", ...args);
}

function error(...args: unknown[]): void {
  console.error("❌", ...args);
}

async function safeReadJson<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const raw = await fs.readFile(path, "utf8");
    const json = JSON.parse(raw);
    const parsed = schema.safeParse(json);
    if (parsed.success) {
      return parsed.data;
    }
    warn(`Schema validation failed for ${basename(path)}:`, parsed.error.format());
    return null;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      warn(`Failed to read ${basename(path)}:`, err);
    }
    return null;
  }
}

// -----------------------------------------------------------------------------
// Core Logic
// -----------------------------------------------------------------------------

async function loadRegistry(): Promise<ProcessedPhoneEntry[]> {
  const data = await safeReadJson(CONFIG.PROCESSED_PHONES_JSON, RegistrySchema);
  return data ? Object.values(data.phones) : [];
}

async function fetchDbTimestamps(phoneIds: string[]): Promise<Map<string, string>> {
  if (phoneIds.length === 0) { return new Map(); }

  const map = new Map<string, string>();
  const limit = pLimit(10); // Concurrency for fetching if we need to chunk, but here we use .in()

  // Chunking for safety if phoneIds is huge (Supabase URL limit)
  const CHUNK_SIZE = 200;
  const chunks: string[][] = [];
  for (let i = 0; i < phoneIds.length; i += CHUNK_SIZE) {
    chunks.push(phoneIds.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(chunks.map(chunk => limit(async () => {
    const { data, error: err } = await supabase
      .from("processed_phones")
      .select("phone_id, updated_at")
      .in("phone_id", chunk);

    if (err) {
      warn("Failed to fetch DB timestamps:", err.message);
      return;
    }

    data?.forEach(row => {
      map.set(row.phone_id, row.updated_at);
    });
  })));

  return map;
}

async function diffEntries(entries: ProcessedPhoneEntry[]): Promise<ProcessedPhoneEntry[]> {
  const phoneIds = entries.map(e => e.phoneId);
  const dbMap = await fetchDbTimestamps(phoneIds);
  const needsSync: ProcessedPhoneEntry[] = [];

  for (const entry of entries) {
    try {
      const dir = join(CONFIG.PROCESSED_CONTENT_DIR, entry.phoneId.toLowerCase());
      const filePath = join(dir, entry.filename);
      const stats = await fs.stat(filePath).catch(() => null);

      if (!stats) {
        // File missing, skip but warn? Or try to sync anyway (will fail later)?
        // We'll skip here to avoid errors later.
        continue;
      }

      const dbUpdated = dbMap.get(entry.phoneId);
      if (!dbUpdated || stats.mtimeMs > new Date(dbUpdated).getTime()) {
        needsSync.push(entry);
      }
    } catch (err) {
      warn(`Diff check error for ${entry.phoneId}:`, err);
    }
  }
  return needsSync;
}

// LZFOF: Optimized - pre-computed timestamp, direct property assignment
function buildDbRow(reg: ProcessedPhoneEntry, enriched: EnrichedData, useOriginalAttributes: boolean = false): DbRow {
  const attributesToUse = useOriginalAttributes ? (enriched.originalAttributes || enriched.attributes) : enriched.attributes;
  const scoreToUse = useOriginalAttributes ? (enriched.originalOverallScore || enriched.overallScore) : enriched.overallScore;
  const now = new Date().toISOString();

  const row: DbRow = {
    phone_id: reg.phoneId,
    brand: enriched.brand || reg.brand,
    model: enriched.model || reg.model,
    release_date: enriched.releaseDate ? new Date(enriched.releaseDate).toISOString() : null,
    overall_score: scoreToUse ? Math.round(scoreToUse * 100) / 100 : null,
    category: enriched.category || null,
    summary: enriched.onePageSummary || null,
    pros: enriched.pros ? enriched.pros.join("\n") : null,
    cons: enriched.cons ? enriched.cons.join("\n") : null,
    confidence: enriched.metadata?.confidence ? Math.round(enriched.metadata.confidence * 100) : null,
    processing_time_ms: enriched.metadata?.processingTimeMs ?? null,
    last_processed_at: reg.lastProcessedAt || now,
    enrichment_status: reg.enrichmentStatus || "completed",
    facts_version: reg.factsVersion || "unknown",
    full_data: enriched,
    updated_at: now,
  };

  // Direct attribute mapping without intermediate entries array
  if (attributesToUse) {
    const cam = attributesToUse["Camera"];
    if (cam) { row["camera_score"] = cam.score; }
    const bat = attributesToUse["Battery Endurance"];
    if (bat) { row["battery_score"] = bat.score; }
    const perf = attributesToUse["Performance"];
    if (perf) { row["performance_score"] = perf.score; }
    const disp = attributesToUse["Display"];
    if (disp) { row["display_score"] = disp.score; }
    const soft = attributesToUse["Software Experience"];
    if (soft) { row["software_score"] = soft.score; }
    const design = attributesToUse["Design & Build"];
    if (design) { row["design_score"] = design.score; }
    const long = attributesToUse["Longevity Value"];
    if (long) { row["longevity_score"] = long.score; }
  }

  return row;
}

async function batchUpsert(rows: DbRow[], tableName: string): Promise<number> {
  if (rows.length === 0) { return 0; }
  let successCount = 0;

  for (let i = 0; i < rows.length; i += CONFIG.BATCH_DB_UPSERT) {
    const chunk = rows.slice(i, i + CONFIG.BATCH_DB_UPSERT);
    const { error: err } = await supabase
      .from(tableName)
      .upsert(chunk, { onConflict: "phone_id" });

    if (err) {
      error(`Batch upsert failed for chunk ${i} to ${tableName}:`, err.message);
      // Continue with next chunk? Or throw? Throwing is safer for data integrity awareness.
      throw new Error(err.message);
    }
    successCount += chunk.length;
  }
  return successCount;
}

// -----------------------------------------------------------------------------
// Image Handling
// -----------------------------------------------------------------------------

async function listCloudFiles(phoneId: string): Promise<string[]> {
  const { data, error: err } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .list(`phones/${phoneId}/`);

  if (err) {
    warn(`Failed to list storage for ${phoneId}:`, err.message);
    return [];
  }
  return data ? data.map(f => f.name) : [];
}

async function uploadImages(phoneId: string, localDir: string, limiter: ReturnType<typeof pLimit>): Promise<string[]> {
  const urls: string[] = [];
  let files: string[] = [];

  try {
    files = (await fs.readdir(localDir)).filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f));
  } catch {
    return [];
  }

  const tasks = files.map(file => limiter(async () => {
    try {
      const buffer = await fs.readFile(join(localDir, file));
      const storagePath = `phones/${phoneId}/${file}`;

      const { error: uploadErr } = await supabase.storage
        .from(CONFIG.STORAGE_BUCKET)
        .upload(storagePath, buffer, { upsert: true, contentType: "image/jpeg" }); // Simple content type assumption or detect

      if (uploadErr) { throw uploadErr; }

      const { data } = supabase.storage
        .from(CONFIG.STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      urls.push(data.publicUrl);
    } catch (err) {
      warn(`Failed to upload ${file} for ${phoneId}:`, err);
    }
  }));

  await Promise.all(tasks);
  return urls;
}

async function cleanupOrphans(phoneId: string, localFiles: string[]): Promise<void> {
  const cloudFiles = await listCloudFiles(phoneId);
  const localSet = new Set(localFiles);
  const toRemove = cloudFiles.filter(f => !localSet.has(f)).map(f => `phones/${phoneId}/${f}`);

  if (toRemove.length > 0) {
    const { error: err } = await supabase.storage
      .from(CONFIG.STORAGE_BUCKET)
      .remove(toRemove);

    if (err) { warn(`Failed to remove orphans for ${phoneId}:`, err.message); }
  }
}

// -----------------------------------------------------------------------------
// Export Logic
// -----------------------------------------------------------------------------

async function exportData(): Promise<void> {
  const tables = ["processed_phones", "dynamic_phones", "phones", "processing_metadata", "reviews"];
  await fs.mkdir(CONFIG.EXPORTS_DIR, { recursive: true });

  for (const table of tables) {
    try {
      const { data: all } = await supabase.from(table).select("*");
      if (!all) { continue; }

      const exportPath = resolve(CONFIG.EXPORTS_DIR, `${table}.json`);

      const payload = {
        metadata: {
          table,
          record_count: all.length,
          exported_at: new Date().toISOString(),
        },
        data: all,
      };

      const content = JSON.stringify(payload, null, 2);
      await fs.writeFile(exportPath, content);

      info(`Exported ${table} -> ${basename(exportPath)}`);
    } catch (err) {
      warn(`Export failed for ${table}:`, err);
    }
  }
}

// -----------------------------------------------------------------------------
// Main Pipeline
// -----------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const skipImages = args.includes("--no-images");
  const doExport = args.includes("--export");

  // Initialize telemetry
  await initializeTelemetry({
    serviceName: "smartmatch-sync",
    serviceVersion: "1.0.0",
    environment: process.env.NODE_ENV || "production",
    otlpEndpoint: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] || "",
    consoleExporter: process.env.NODE_ENV === "development",
  });

  const workflowStartTime = Date.now();
  const workflowSpan = startSpan("sync_workflow", {
    kind: "server",
    attributes: {
      "service.name": "smartmatch-sync",
      "service.version": "1.0.0",
      "workflow.name": "sync",
      "workflow.run_id": randomUUID(),
    },
  });

  try {
    info("Starting SmartMatch Sync...");

    const registry = await loadRegistry();
    if (registry.length === 0) {
      info("No registry entries found.");
      recordWorkflowRun("sync", Date.now() - workflowStartTime, "success");
      return;
    }

    const toSync = await diffEntries(registry);
    info(`Found ${toSync.length} phones needing sync.`);

    if (toSync.length === 0 && !doExport) {
      info("Nothing to sync.");
      recordWorkflowRun("sync", Date.now() - workflowStartTime, "success");
      return;
    }

    const rawRows: DbRow[] = [];
    const dynamicRows: DbRow[] = [];
    const imageUpdates: { phone_id: string; image_urls: string[]; updated_at: string }[] = [];
    const imageLimiter = pLimit(CONFIG.IMAGE_UPLOAD_CONCURRENCY);

    // Process phones
    for (const entry of toSync) {
      const phoneStartTime = Date.now();
      const phoneSpan = startSpan(`sync_phone_${entry.phoneId}`, {
        kind: "server",
        attributes: {
          "workflow.name": "sync",
          "workflow.step": "process_phone",
          "phone.id": entry.phoneId,
          "phone.brand": entry.brand,
          "phone.model": entry.model,
        },
      });

      try {
        const dir = join(CONFIG.PROCESSED_CONTENT_DIR, entry.phoneId.toLowerCase());
        const filePath = join(dir, entry.filename);

        // We use a looser schema for reading the file initially to handle wrapping
        const FileSchema = z.object({
          data: EnrichedDataSchema.optional(),
        }).passthrough();

        const raw = await safeReadJson(filePath, FileSchema);
        // If it's wrapped in "data", use that, otherwise assume it's the object itself (if valid)
        let enriched: EnrichedData | undefined;

        if (raw?.data) {
          enriched = raw.data;
        } else {
          // Try parsing as direct EnrichedData
          const directParse = EnrichedDataSchema.safeParse(raw);
          if (directParse.success) { enriched = directParse.data; }
        }

        if (!enriched) {
          warn(`Skipping ${entry.phoneId}: Invalid or missing enriched data.`);
          recordWorkflowStep("sync", "process_phone", Date.now() - phoneStartTime, "failure");
          endSpan(phoneSpan, "failure");
          continue;
        }

        // 1. Raw Sync (Pre-OSET) -> processed_phones
        rawRows.push(buildDbRow(entry, enriched, true));

        // 2. Dynamic Sync (Post-OSET) -> dynamic_phones
        dynamicRows.push(buildDbRow(entry, enriched, false));

        info(`Successfully processed ${entry.phoneId}`);
        recordWorkflowStep("sync", "process_phone", Date.now() - phoneStartTime, "success");
        endSpan(phoneSpan, "success");
      } catch (err) {
        warn(`Failed to process ${entry.phoneId}:`, err);
        recordWorkflowStep("sync", "process_phone", Date.now() - phoneStartTime, "failure");
        endSpan(phoneSpan, "failure", err as Error);
        continue;
      }

      if (!skipImages) {
        const imageStartTime = Date.now();
        const imageSpan = startSpan(`upload_images_${entry.phoneId}`, {
          kind: "server",
          attributes: {
            "workflow.name": "sync",
            "workflow.step": "upload_images",
            "phone.id": entry.phoneId,
          },
        });

        try {
          const dir = join(CONFIG.PROCESSED_CONTENT_DIR, entry.phoneId);
          const localImageDir = join(dir, CONFIG.IMAGES_SUBDIR);
          const urls = await uploadImages(entry.phoneId, localImageDir, imageLimiter);

          // Cleanup orphans
          const localFiles = (await fs.readdir(localImageDir).catch(() => [])).filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f));
          await cleanupOrphans(entry.phoneId, localFiles);

          if (urls.length > 0) {
            imageUpdates.push({
              phone_id: entry.phoneId,
              image_urls: urls,
              updated_at: new Date().toISOString(),
            });
          }

          recordWorkflowStep("sync", "upload_images", Date.now() - imageStartTime, "success");
          endSpan(imageSpan, "success");
        } catch (err) {
          warn(`Failed to upload images for ${entry.phoneId}:`, err);
          recordWorkflowStep("sync", "upload_images", Date.now() - imageStartTime, "failure");
          endSpan(imageSpan, "failure", err as Error);
        }
      }
    }

    // DB Upsert - Raw (processed_phones)
    if (rawRows.length > 0) {
      const dbStartTime = Date.now();
      const dbSpan = startSpan("batch_upsert_raw", {
        kind: "server",
        attributes: {
          "workflow.name": "sync",
          "workflow.step": "batch_upsert_raw",
          "db.table": "processed_phones",
          "db.record_count": rawRows.length,
        },
      });

      try {
        const startTime = Date.now();
        const count = await batchUpsert(rawRows, "processed_phones");
        const duration = Date.now() - startTime;

        info(`Upserted ${count} raw records to processed_phones.`);
        recordDbUpsert("sync", "processed_phones", count, duration);
        recordWorkflowStep("sync", "batch_upsert_raw", duration, "success");
        endSpan(dbSpan, "success");
      } catch (err) {
        error("Batch upsert raw failed:", err);
        recordWorkflowStep("sync", "batch_upsert_raw", Date.now() - dbStartTime, "failure");
        endSpan(dbSpan, "failure", err as Error);
        throw err;
      }
    }

    // DB Upsert - Dynamic (dynamic_phones)
    if (dynamicRows.length > 0) {
      const dbStartTime = Date.now();
      const dbSpan = startSpan("batch_upsert_dynamic", {
        kind: "server",
        attributes: {
          "workflow.name": "sync",
          "workflow.step": "batch_upsert_dynamic",
          "db.table": "dynamic_phones",
          "db.record_count": dynamicRows.length,
        },
      });

      try {
        const startTime = Date.now();
        const count = await batchUpsert(dynamicRows, "dynamic_phones");
        const duration = Date.now() - startTime;

        info(`Upserted ${count} dynamic records to dynamic_phones.`);
        recordDbUpsert("sync", "dynamic_phones", count, duration);
        recordWorkflowStep("sync", "batch_upsert_dynamic", duration, "success");
        endSpan(dbSpan, "success");
      } catch (err) {
        error("Batch upsert dynamic failed:", err);
        recordWorkflowStep("sync", "batch_upsert_dynamic", Date.now() - dbStartTime, "failure");
        endSpan(dbSpan, "failure", err as Error);
        throw err;
      }
    }

    // Image URL Updates
    if (imageUpdates.length > 0) {
      const imageUpdateStartTime = Date.now();
      const imageUpdateSpan = startSpan("update_image_urls", {
        kind: "server",
        attributes: {
          "workflow.name": "sync",
          "workflow.step": "update_image_urls",
          "image.count": imageUpdates.length,
        },
      });

      try {
        const { error: err } = await supabase
          .from("processed_phones")
          .upsert(imageUpdates, { onConflict: "phone_id" });

        if (err) {
          error("Failed to update image URLs:", err.message);
          recordWorkflowStep("sync", "update_image_urls", Date.now() - imageUpdateStartTime, "failure");
          endSpan(imageUpdateSpan, "failure", err);
        } else {
          info(`Updated image URLs for ${imageUpdates.length} phones.`);
          recordWorkflowStep("sync", "update_image_urls", Date.now() - imageUpdateStartTime, "success");
          endSpan(imageUpdateSpan, "success");
        }
      } catch (err) {
        error("Failed to update image URLs:", err);
        recordWorkflowStep("sync", "update_image_urls", Date.now() - imageUpdateStartTime, "failure");
        endSpan(imageUpdateSpan, "failure", err as Error);
      }
    }

    if (doExport) {
      const exportStartTime = Date.now();
      const exportSpan = startSpan("export_data", {
        kind: "server",
        attributes: {
          "workflow.name": "sync",
          "workflow.step": "export_data",
        },
      });

      try {
        await exportData();
        recordWorkflowStep("sync", "export_data", Date.now() - exportStartTime, "success");
        endSpan(exportSpan, "success");
      } catch (err) {
        warn("Export failed:", err);
        recordWorkflowStep("sync", "export_data", Date.now() - exportStartTime, "failure");
        endSpan(exportSpan, "failure", err as Error);
      }
    }

    const workflowDuration = Date.now() - workflowStartTime;
    recordWorkflowRun("sync", workflowDuration, "success");
    info("Sync complete.");
    endSpan(workflowSpan, "success");
  } catch (err) {
    error("Fatal error:", err);
    const workflowDuration = Date.now() - workflowStartTime;
    recordWorkflowRun("sync", workflowDuration, "failure");
    endSpan(workflowSpan, "failure", err as Error);
    await shutdownTelemetry();
    process.exit(1);
  }

  await shutdownTelemetry();
}

main().catch(err => {
  error("Fatal error:", err);
  process.exit(1);
});
