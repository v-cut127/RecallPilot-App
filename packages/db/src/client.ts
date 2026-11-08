import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { getDatabaseUrl, isLocalDatabaseUrl } from "./env";

let pool: Pool | null = null;
let database: NodePgDatabase<typeof schema> | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    const useSsl =
      process.env.DATABASE_SSL === "true" ||
      (process.env.DATABASE_SSL !== "false" && !isLocalDatabaseUrl(connectionString));
    pool = new Pool({
      connectionString,
      max: Number.parseInt(process.env.DATABASE_POOL_MAX ?? "10", 10),
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!database) {
    database = drizzle(getPool(), { schema });
  }
  return database;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    database = null;
  }
}

export { schema };
export * from "drizzle-orm";
