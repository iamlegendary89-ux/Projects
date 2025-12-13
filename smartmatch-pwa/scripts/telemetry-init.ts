#!/usr/bin/env node

import { initializeTelemetry, shutdownTelemetry } from "../lib/telemetry/telemetry.js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env.local") });

async function main() {
  try {
    await initializeTelemetry({
      serviceName: "smartmatch-workflow",
      serviceVersion: "1.0.0",
      environment: process.env.NODE_ENV || "production",
      otlpEndpoint: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] || "",
      consoleExporter: process.env.NODE_ENV === "development",
    });

    console.log("✅ Telemetry initialized successfully");
    console.log("📊 Metrics and traces are now being collected");

    // Keep the process running for manual testing
    if (process.argv.includes("--keep-alive")) {
      console.log("🔄 Keeping process alive for manual testing...");
      setInterval(() => { }, 1000);
    }
  } catch (error) {
    console.error("❌ Failed to initialize telemetry:", error);
    process.exit(1);
  }
}

main();

process.on("SIGINT", async () => {
  await shutdownTelemetry();
  process.exit();
});

process.on("SIGTERM", async () => {
  await shutdownTelemetry();
  process.exit();
});
