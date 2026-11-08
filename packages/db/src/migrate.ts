import fs from "node:fs/promises";
import path from "node:path";
import { REPO_ROOT, getDatabaseUrl } from "./env";
import { Pool } from "pg";

const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");
const BOOTSTRAP_FILE = path.join(REPO_ROOT, "packages", "db", "src", "bootstrap.sql");

export async function runSqlFile(client: { query: (sql: string) => Promise<unknown> }, file: string): Promise<void> {
  const sql = await fs.readFile(file, "utf8");
  await client.query(sql);
}

export async function bootstrapLocalDatabase(): Promise<void> {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  try {
    await runSqlFile(pool, BOOTSTRAP_FILE);
    console.log("Local auth bootstrap applied.");
  } finally {
    await pool.end();
  }
}

export async function migrateDatabase(): Promise<string[]> {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const appliedNow: string[] = [];
  try {
    await pool.query(`
      create table if not exists public.schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const existing = await pool.query("select 1 from public.schema_migrations where version = $1", [file]);
      if (existing.rowCount && existing.rowCount > 0) continue;
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into public.schema_migrations (version) values ($1)", [file]);
        await client.query("commit");
        appliedNow.push(file);
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
  if (appliedNow.length === 0) console.log("Database already up to date.");
  return appliedNow;
}
