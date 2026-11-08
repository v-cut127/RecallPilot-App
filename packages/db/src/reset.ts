import { Pool } from "pg";
import { getDatabaseUrl, isLocalDatabaseUrl, loadEnv } from "./env";
import { bootstrapLocalDatabase, migrateDatabase } from "./migrate";

async function reset(): Promise<void> {
  loadEnv();
  const url = getDatabaseUrl();
  if (!isLocalDatabaseUrl(url) && process.env.ALLOW_REMOTE_DB_RESET !== "1") {
    throw new Error("Refusing to reset a non-local database. Set ALLOW_REMOTE_DB_RESET=1 to override.");
  }
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query("drop schema if exists public cascade");
    await pool.query("create schema public");
    await pool.query("drop schema if exists auth cascade");
    console.log("Schemas dropped.");
  } finally {
    await pool.end();
  }
  await bootstrapLocalDatabase();
  await migrateDatabase();
  console.log("Database reset complete.");
}

reset()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
