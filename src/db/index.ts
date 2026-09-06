import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Supabase IS PostgreSQL — so the same Drizzle ORM connection works.
// When SUPABASE_DB_URL is set, it uses Supabase. Otherwise local PostgreSQL.
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or SUPABASE_DB_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);

export function isSupabaseMode(): boolean {
  return !!(process.env.SUPABASE_DB_URL);
}
