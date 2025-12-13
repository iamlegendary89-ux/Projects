import postgres from "postgres";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load Env
dotenv.config({ path: ".env.local" });

const SCHEMA_PATH = path.resolve("worker/data/supabase_schema.sql");
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DB_URL) {
  console.error("❌ Missing DATABASE_URL in .env.local");
  process.exit(1);
}

async function runMigration() {
  console.log("🐘 Starting Database Migration (via postgres.js)...");

  // Read SQL
  const sqlContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
  console.log(`   -> Loaded SQL from ${SCHEMA_PATH} (${sqlContent.length} bytes)`);

  const sql = postgres(DB_URL as string, {
    ssl: "require",
    max: 1,
  });

  try {
    console.log("   -> Connecting to Postgres...");

    // postgres.js 'file' method relies on path, but we have content. 
    // We can use sql.unsafe() for raw queries.
    await sql.unsafe(sqlContent);

    console.log("✅ Migration applied successfully.");

  } catch (err) {
    console.error("❌ Migration Failed:", err);
  } finally {
    await sql.end();
  }
}

runMigration().catch(console.error);
