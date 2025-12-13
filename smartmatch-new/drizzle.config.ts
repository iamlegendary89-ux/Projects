import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ Supabase environment variables missing. Drizzle Kit might fail.');
}

// Construct connection string for Drizzle Kit (using Transaction Pooler for migrations is safer)
// Format: postgres://[user]:[password]@[host]:[port]/[db]
// Note: Supabase provides a direct connection string in the dashboard.
// For now, we assume the user will provide DATABASE_URL in .env.local
const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl) {
    console.warn('❌ DATABASE_URL environment variable is not set!');
}

export default defineConfig({
    schema: './lib/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: dbUrl,
    },
    verbose: true,
    strict: true,
});
