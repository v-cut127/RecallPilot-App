import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { bootstrapLocalDatabase, migrateDatabase } from "../src/migrate";
import { getDatabaseUrl } from "../src/env";
import { purgeExpiredUploads } from "../../../apps/worker/src/purge";

let pool: Pool;
const importId = randomUUID();

beforeAll(async () => {
  await bootstrapLocalDatabase();
  await migrateDatabase();
  pool = new Pool({ connectionString: getDatabaseUrl() });
  await pool.query(
    `insert into public.imports (id, org_id, lead_email, filename, size_bytes, storage_path, status, purge_at, row_count, valid_count, error_count)
     values ($1, null, 'purge@example.test', 'purge.csv', 10, 'imports/leads/missing-purge-file.csv', 'failed', now() - interval '1 hour', 1, 0, 1)`,
    [importId]
  );
  await pool.query(
    `insert into public.import_rows (import_id, org_id, row_number, status, raw, issues, created_at)
     values ($1, null, 2, 'error', '{"name":"Old Lead"}'::jsonb, '[]'::jsonb, now() - interval '25 hours')`,
    [importId]
  );
});

afterAll(async () => {
  await pool.query("delete from public.imports where id = $1", [importId]);
  await pool.end();
});

describe("retention", () => {
  it("purges expired raw uploads and old lead import rows", async () => {
    const result = await purgeExpiredUploads();
    expect(result.purged).toBeGreaterThanOrEqual(1);

    const importResult = await pool.query<{ raw_purged_at: Date | null }>(
      "select raw_purged_at from public.imports where id = $1",
      [importId]
    );
    expect(importResult.rows[0]?.raw_purged_at).not.toBeNull();

    const rows = await pool.query("select id from public.import_rows where import_id = $1", [importId]);
    expect(rows.rowCount).toBe(0);
  });
});
