import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { bootstrapLocalDatabase, migrateDatabase } from "../src/migrate";
import { getDatabaseUrl } from "../src/env";

interface Fixture {
  userA: string;
  userB: string;
  orgA: string;
  orgB: string;
  patientA: string;
  patientB: string;
  auditA: string;
  auditB: string;
  importA: string;
  importB: string;
}

let pool: Pool;
let fixture: Fixture;

async function asUser<T>(userId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function asAnon<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role anon");
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "anon" })]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  await bootstrapLocalDatabase();
  await migrateDatabase();
  pool = new Pool({ connectionString: getDatabaseUrl() });

  const userA = randomUUID();
  const userB = randomUUID();
  const orgA = randomUUID();
  const orgB = randomUUID();
  const patientA = randomUUID();
  const patientB = randomUUID();
  const auditA = randomUUID();
  const auditB = randomUUID();
  const importA = randomUUID();
  const importB = randomUUID();

  await pool.query(
    "insert into auth.users (id, email) values ($1, $2), ($3, $4)",
    [userA, `rls-a-${userA}@example.test`, userB, `rls-b-${userB}@example.test`]
  );
  await pool.query(
    `insert into public.organizations (id, name, slug, created_by)
     values ($1, 'RLS Practice A', $2, $3), ($4, 'RLS Practice B', $5, $6)`,
    [orgA, `rls-a-${orgA}`, userA, orgB, `rls-b-${orgB}`, userB]
  );
  await pool.query(
    "insert into public.memberships (org_id, user_id, role) values ($1, $2, 'owner'), ($3, $4, 'owner')",
    [orgA, userA, orgB, userB]
  );
  await pool.query(
    `insert into public.patients (id, org_id, patient_key, first_name, last_name)
     values ($1, $2, 'ext:a-1', 'Alice', 'Alpha'), ($3, $4, 'ext:b-1', 'Bob', 'Beta')`,
    [patientA, orgA, patientB, orgB]
  );
  await pool.query(
    `insert into public.imports (id, org_id, filename, size_bytes, status)
     values ($1, $2, 'a.csv', 10, 'completed'), ($3, $4, 'b.csv', 10, 'completed')`,
    [importA, orgA, importB, orgB]
  );
  await pool.query(
    `insert into public.audits (id, org_id, import_id, token, status, expires_at)
     values ($1, $2, $3, $4, 'completed', now() + interval '30 days'),
            ($5, $6, $7, $8, 'completed', now() + interval '30 days')`,
    [auditA, orgA, importA, `token-a-${auditA}`, auditB, orgB, importB, `token-b-${auditB}`]
  );

  fixture = { userA, userB, orgA, orgB, patientA, patientB, auditA, auditB, importA, importB };
});

afterAll(async () => {
  if (pool) {
    await pool.query("delete from public.organizations where id = any($1::uuid[])", [
      [fixture?.orgA, fixture?.orgB].filter(Boolean),
    ]);
    await pool.query("delete from auth.users where id = any($1::uuid[])", [
      [fixture?.userA, fixture?.userB].filter(Boolean),
    ]);
    await pool.end();
  }
});

describe("RLS tenant isolation", () => {
  it("lets a user read only their own organization and membership", async () => {
    const result = await asUser(fixture.userA, async (client) => {
      const orgs = await client.query("select id from public.organizations order by name");
      const members = await client.query("select org_id from public.memberships");
      return { orgs: orgs.rows, members: members.rows };
    });
    expect(result.orgs).toEqual([{ id: fixture.orgA }]);
    expect(result.members).toEqual([{ org_id: fixture.orgA }]);
  });

  it("lets a user read only their own patients, imports and audits", async () => {
    const result = await asUser(fixture.userA, async (client) => {
      const patients = await client.query("select id from public.patients");
      const imports = await client.query("select id from public.imports");
      const audits = await client.query("select id from public.audits");
      return { patients: patients.rows, imports: imports.rows, audits: audits.rows };
    });
    expect(result.patients).toEqual([{ id: fixture.patientA }]);
    expect(result.imports).toEqual([{ id: fixture.importA }]);
    expect(result.audits).toEqual([{ id: fixture.auditA }]);
  });

  it("blocks a user from inserting a patient into another organization", async () => {
    await expect(
      asUser(fixture.userA, async (client) => {
        await client.query(
          "insert into public.patients (org_id, patient_key, first_name) values ($1, 'ext:evil', 'Evil')",
          [fixture.orgB]
        );
      })
    ).rejects.toThrow(/row-level security/i);
  });

  it("blocks a user from updating or deleting another organization's patient", async () => {
    const result = await asUser(fixture.userA, async (client) => {
      const updated = await client.query("update public.patients set first_name = 'Hacked' where id = $1", [
        fixture.patientB,
      ]);
      const deleted = await client.query("delete from public.patients where id = $1", [fixture.patientB]);
      return { updated: updated.rowCount, deleted: deleted.rowCount };
    });
    expect(result.updated).toBe(0);
    expect(result.deleted).toBe(0);
  });

  it("blocks a user from reading or revoking another organization's audit", async () => {
    const result = await asUser(fixture.userA, async (client) => {
      const read = await client.query("select id from public.audits where id = $1", [fixture.auditB]);
      const revoked = await client.query("update public.audits set revoked_at = now() where id = $1", [
        fixture.auditB,
      ]);
      return { read: read.rowCount, revoked: revoked.rowCount };
    });
    expect(result.read).toBe(0);
    expect(result.revoked).toBe(0);
  });

  it("does not expose tenant tables to unauthenticated anon queries", async () => {
    await expect(
      asAnon(async (client) => client.query("select id from public.patients"))
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asAnon(async (client) => client.query("select id from public.audits"))
    ).rejects.toThrow(/permission denied/i);
  });

  it("keeps audit logs append-only", async () => {
    const inserted = await asUser(fixture.userA, async (client) => {
      await client.query(
        "insert into public.audit_logs (org_id, actor_user_id, action) values ($1, $2, 'test.action')",
        [fixture.orgA, fixture.userA]
      );
      const visible = await client.query("select action from public.audit_logs where org_id = $1", [fixture.orgA]);
      return visible.rows;
    });
    expect(inserted).toEqual([{ action: "test.action" }]);

    await expect(
      asUser(fixture.userA, async (client) => {
        await client.query("update public.audit_logs set action = 'changed' where org_id = $1", [fixture.orgA]);
      })
    ).rejects.toThrow(/permission denied/i);

    await expect(
      asUser(fixture.userA, async (client) => {
        await client.query("delete from public.audit_logs where org_id = $1", [fixture.orgA]);
      })
    ).rejects.toThrow(/permission denied/i);
  });
});
