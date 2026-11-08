import fs from "node:fs/promises";
import path from "node:path";
import { format } from "date-fns";
import { and, eq, getDb } from "./index";
import { REPO_ROOT } from "./env";
import { getPool } from "./client";
import { bootstrapLocalDatabase, migrateDatabase } from "./migrate";
import {
  audits,
  imports,
  locations,
  memberships,
  organizations,
  providers,
  recallRules,
} from "./schema";
import { commitNormalizedRows } from "./import-commit";
import { DEMO_ORG, generateSyntheticClinic, toNormalizedRows } from "./seed-data";
import { writeSeedFiles } from "./generate-seed-csv";
import { calculateAudit } from "@recallpilot/core";
import { hashPassword } from "@recallpilot/core/password";
import { renderAuditPdf } from "@recallpilot/core/pdf";
import { generateShareToken, shareTokenPrefix } from "@recallpilot/core/share-token";

async function seed(): Promise<void> {
  await bootstrapLocalDatabase();
  await migrateDatabase();
  const db = getDb();
  const pool = getPool();
  const asOfDate = format(new Date(), "yyyy-MM-dd");
  const clinic = generateSyntheticClinic({ count: 2_500, asOfDate, seed: 42 });
  const normalizedRows = toNormalizedRows(clinic);

  const passwordHash = hashPassword(DEMO_ORG.userPassword);
  const userResult = await pool.query<{ id: string }>(
    `insert into auth.users (id, email, encrypted_password, raw_user_meta_data, email_confirmed_at)
     values (gen_random_uuid(), $1, $2, $3::jsonb, now())
     on conflict (email) do update
       set encrypted_password = excluded.encrypted_password,
           raw_user_meta_data = excluded.raw_user_meta_data,
           email_confirmed_at = now()
     returning id`,
    [DEMO_ORG.userEmail, passwordHash, JSON.stringify({ full_name: DEMO_ORG.userName })]
  );
  const userId = userResult.rows[0]?.id;
  if (!userId) throw new Error("Could not create the demo user.");
  await pool.query("update public.profiles set full_name = $1, email = $2 where id = $3", [
    DEMO_ORG.userName,
    DEMO_ORG.userEmail,
    userId,
  ]);

  const [organization] = await db
    .insert(organizations)
    .values({
      name: DEMO_ORG.name,
      slug: DEMO_ORG.slug,
      country: DEMO_ORG.country,
      locale: DEMO_ORG.locale,
      timezone: DEMO_ORG.timezone,
      createdBy: userId,
    })
    .onConflictDoUpdate({
      target: organizations.slug,
      set: { name: DEMO_ORG.name, createdBy: userId },
    })
    .returning({ id: organizations.id });
  if (!organization) throw new Error("Could not create the demo organization.");

  await db
    .insert(memberships)
    .values({ orgId: organization.id, userId, role: "owner" })
    .onConflictDoUpdate({
      target: [memberships.orgId, memberships.userId],
      set: { role: "owner" },
    });

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
      .onConflictDoUpdate({
        target: [locations.orgId, locations.name],
        set: { city: location.city, country: location.country, timezone: location.timezone },
      })
      .returning({ id: locations.id });
    if (record) locationIds.set(location.name, record.id);
  }

  for (const location of clinic.locations) {
    for (const providerName of location.providers) {
      await db
        .insert(providers)
        .values({
          orgId: organization.id,
          locationId: locationIds.get(location.name) ?? null,
          name: providerName,
          specialty: providerName.toLowerCase().includes("sophie") || providerName.toLowerCase().includes("emma") ? "hygienist" : "dentist",
        })
        .onConflictDoUpdate({
          target: [providers.orgId, providers.name],
          set: { locationId: locationIds.get(location.name) ?? null },
        });
    }
  }

  const existingRules = await db
    .select({ id: recallRules.id })
    .from(recallRules)
    .where(eq(recallRules.orgId, organization.id))
    .limit(1);
  if (existingRules.length === 0) {
    await db.insert(recallRules).values([
      { orgId: organization.id, locationId: null, name: "Hygiene recall", treatmentType: "hygiene", intervalMonths: 6 },
      { orgId: organization.id, locationId: null, name: "Check-up recall", treatmentType: "checkup", intervalMonths: 12 },
      { orgId: organization.id, locationId: null, name: "Treatment follow-up", treatmentType: "treatment", intervalMonths: 12 },
    ]);
  }

  await commitNormalizedRows({
    orgId: organization.id,
    importId: null,
    rows: normalizedRows,
  });

  const existingSeedImports = await db
    .select({ id: imports.id })
    .from(imports)
    .where(and(eq(imports.orgId, organization.id), eq(imports.filename, "synthetic-seed.csv")));
  for (const existing of existingSeedImports) {
    await db.delete(audits).where(eq(audits.importId, existing.id));
    await db.delete(imports).where(eq(imports.id, existing.id));
  }

  const [seedImport] = await db
    .insert(imports)
    .values({
      orgId: organization.id,
      filename: "synthetic-seed.csv",
      mimeType: "text/csv",
      sizeBytes: 0,
      status: "completed",
      stage: "completed",
      rowCount: clinic.rows.length + clinic.messyRows.length,
      validCount: clinic.rows.length,
      errorCount: clinic.messyRows.length,
      stats: { seed: true, variants: ["comma-iso", "semicolon-ddmmyyyy"] },
      rawPurgedAt: new Date(),
    })
    .returning({ id: imports.id });
  if (!seedImport) throw new Error("Could not create the seed import record.");

  const validatedRows = normalizedRows.map((row) => ({ rowNumber: row.rowNumber, normalized: row, issues: [] }));
  const summary = calculateAudit({
    rows: validatedRows,
    practiceName: DEMO_ORG.name,
    asOfDate,
  });
  const ttlDays = Number.parseInt(process.env.AUDIT_LINK_TTL_DAYS ?? "30", 10);
  const token = generateShareToken();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const reportUrl = `${appUrl}/audit/${token}`;

  let pdfPath: string | null = null;
  if ((process.env.STORAGE_DRIVER ?? "local") === "local") {
    try {
      const pdf = await renderAuditPdf({ summary, reportUrl, expiresAt });
      const storageRoot = path.resolve(REPO_ROOT, process.env.STORAGE_LOCAL_DIR ?? ".storage");
      const target = path.join(storageRoot, "reports", "seed-audit.pdf");
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, pdf);
      pdfPath = "reports/seed-audit.pdf";
    } catch (error) {
      console.warn("Could not generate the seed PDF; the report page will still work.", error);
    }
  }

  await db.insert(audits).values({
    orgId: organization.id,
    importId: seedImport.id,
    practiceName: DEMO_ORG.name,
    token,
    tokenPrefix: shareTokenPrefix(token),
    status: "completed",
    summary,
    assumptions: summary.assumptions,
    pdfPath,
    expiresAt,
    completedAt: new Date(),
  });

  const csvFiles = await writeSeedFiles();

  console.log("");
  console.log("Synthetic seed complete.");
  console.log(`Organization: ${DEMO_ORG.name} (${clinic.locations.length} locations)`);
  console.log(`Demo user: ${DEMO_ORG.userEmail} / ${DEMO_ORG.userPassword}`);
  console.log(`Patients seeded: ${normalizedRows.length}`);
  console.log(`CSV variants: ${csvFiles.commaPath} and ${csvFiles.semicolonPath}`);
  console.log(`Seed report: ${reportUrl}`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
