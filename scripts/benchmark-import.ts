import "../apps/worker/src/env";
import { randomUUID } from "node:crypto";
import { eq, getDb, getPool, imports, locations, organizations, providers } from "@recallpilot/db";
import { inspectCsv, suggestMapping } from "@recallpilot/core";
import { getStorageAdapter } from "@recallpilot/integrations/storage";
import { csvBuffer, generateSyntheticClinic } from "../packages/db/src/seed-data";
import { commitOrgImport, validateOrgImport } from "../apps/worker/src/pipeline";

async function main(): Promise<void> {
  const db = getDb();
  const pool = getPool();
  const storage = getStorageAdapter();
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const clinic = generateSyntheticClinic({ count: 5_000, seed: 123, asOfDate: new Date().toISOString().slice(0, 10) });
  const cleanClinic = { ...clinic, messyRows: [] };
  const buffer = csvBuffer(cleanClinic, "comma");
  const inspection = inspectCsv(buffer);
  const mapping = suggestMapping(inspection.detection.headers);

  const [organization] = await db
    .insert(organizations)
    .values({
      name: `Benchmark Practice ${unique}`,
      slug: `benchmark-${unique}`,
      country: "DE",
      locale: "en",
    })
    .returning({ id: organizations.id });
  if (!organization) throw new Error("Could not create benchmark organization.");

  const locationIds = new Map<string, string>();
  for (const location of clinic.locations) {
    const [record] = await db
      .insert(locations)
      .values({
        orgId: organization.id,
        name: location.name,
        city: location.city,
        country: location.country,
        timezone: location.timezone,
      })
      .returning({ id: locations.id });
    if (record) locationIds.set(location.name, record.id);
  }
  for (const location of clinic.locations) {
    for (const provider of location.providers) {
      await db.insert(providers).values({
        orgId: organization.id,
        locationId: locationIds.get(location.name) ?? null,
        name: provider,
      });
    }
  }

  const importId = randomUUID();
  const storagePath = `imports/benchmark/${importId}/5000-rows.csv`;
  await storage.put(storagePath, buffer, "text/csv");
  await db.insert(imports).values({
    id: importId,
    orgId: organization.id,
    filename: "5000-rows.csv",
    mimeType: "text/csv",
    sizeBytes: buffer.byteLength,
    storagePath,
    status: "uploaded",
    stage: "uploaded",
    delimiter: inspection.detection.delimiter,
    encoding: inspection.detection.encoding,
    hasBom: inspection.detection.hasBom,
    headers: inspection.detection.headers,
    mapping,
    rowCount: inspection.detection.rowCount,
    purgeAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  console.log(`Benchmarking ${inspection.detection.rowCount} rows...`);
  const validateStart = performance.now();
  await validateOrgImport(importId);
  const validateMs = performance.now() - validateStart;

  const [afterValidate] = await db.select().from(imports).where(eq(imports.id, importId)).limit(1);
  if (afterValidate?.status !== "ready") {
    throw new Error(`Validation failed: ${afterValidate?.status} ${afterValidate?.errorMessage ?? ""}`);
  }
  console.log(`Validation: ${(validateMs / 1000).toFixed(2)}s (${afterValidate.validCount} valid, ${afterValidate.errorCount} errors)`);

  const commitStart = performance.now();
  await commitOrgImport(importId);
  const commitMs = performance.now() - commitStart;

  const [afterCommit] = await db.select().from(imports).where(eq(imports.id, importId)).limit(1);
  if (afterCommit?.status !== "completed") {
    throw new Error(`Commit failed: ${afterCommit?.status} ${afterCommit?.errorMessage ?? ""}`);
  }
  console.log(`Commit + audit + PDF: ${(commitMs / 1000).toFixed(2)}s`);

  const totalMs = validateMs + commitMs;
  console.log(`Total pipeline: ${(totalMs / 1000).toFixed(2)}s for ${inspection.detection.rowCount} rows`);
  if (totalMs >= 60_000) {
    throw new Error("Acceptance failed: 5,000-row import took 60 seconds or more.");
  }
  console.log("Acceptance passed: 5,000-row CSV imported and audited in under 60 seconds.");

  const [audit] = await pool
    .query<{ token: string; pdf_path: string | null }>(
      "select token, pdf_path from public.audits where import_id = $1",
      [importId]
    )
    .then((result) => result.rows);
  if (audit?.token) console.log(`Audit token: ${audit.token}`);

  if (audit?.pdf_path) await storage.delete(audit.pdf_path).catch(() => undefined);
  if (afterCommit?.storagePath) await storage.delete(afterCommit.storagePath).catch(() => undefined);
  await db.delete(organizations).where(eq(organizations.id, organization.id));
  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
