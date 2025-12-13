#!/usr/bin/env node

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const env = process.env;

if (!env["SUPABASE_URL"] || !env["SUPABASE_SERVICE_KEY"]) {
  console.error("❌ Supabase environment variables missing");
  process.exit(1);
}

import { DROP_STATEMENTS } from "../lib/db/schema.js";

const supabase: SupabaseClient = createClient(env["SUPABASE_URL"], env["SUPABASE_SERVICE_KEY"]);

async function resetDatabase() {
  console.log("🗑️  Resetting database...");
  console.log("This will DROP the following tables:");
  console.log(DROP_STATEMENTS.split("\n").filter(line => line.trim().startsWith("DROP")).join("\n"));

  console.log("\n⚠️  Confirm by typing 'yes' to continue:");
  process.stdin.resume();
  const input = await new Promise<string>((resolve) => {
    process.stdin.on("data", (data) => {
      resolve(data.toString().trim());
      process.stdin.end();
    });
  });

  if (input !== "yes") {
    console.log("❌ Reset cancelled");
    process.exit(0);
  }

  try {
    // Execute drop statements
    const drops = DROP_STATEMENTS.split(";").filter(stmt => stmt.trim());
    for (const drop of drops) {
      if (drop.trim()) {
        console.log(`Dropping: ${drop.trim().substring(0, 50)}...`);
        const { error } = await supabase.rpc("exec_sql", { sql: drop.trim() });
        if (error && !error.message?.includes("does not exist")) {
          console.warn(`⚠️  ${error.message}`);
        }
      }
    }

    console.log("✅ Database reset complete!");
    console.log("Run 'npm run db:migrate' to recreate tables");

  } catch (err: any) {
    console.error("❌ Reset failed:", err.message);
    process.exit(1);
  }
}

resetDatabase().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
