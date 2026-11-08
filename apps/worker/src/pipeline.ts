import "./env";
import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  commitNormalizedRows,
  eq,
  getDb,
  audits,
  importRows,
  imports,
  locations,
  memberships,
  organizations,
  profiles,
  providers,
  type ImportRecord,
} from "@recallpilot/db";
import {
  calculateAudit,
  inspectCsv,
  suggestMapping,
  validateMapping,
  validateRows,
  type AuditSummary,
  type ImportMapping,
  type NormalizedPatientRow,
  type RowIssue,
  type ValidatedRow,
} from "@recallpilot/core";
import { generateShareToken, shareTokenPrefix } from "@recallpilot/core/share-token";
import { renderAuditPdf } from "@recallpilot/core/pdf";
import { getEmailAdapter } from "@recallpilot/integrations/email";
import { getStorageAdapter } from "@recallpilot/integrations/storage";
import { appUrl } from "./env";
import { reportEmail } from "./email";
import { purgeRaw } from "./purge";

const db = getDb();
const storage = getStorageAdapter();

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 800);
  return String(error).slice(0, 800);
}

async function loadImport(importId: string): Promise<ImportRecord> {
  const [record] = await db.select().from(imports).where(eq(imports.id, importId)).limit(1);
  if (!record) throw new Error(`Import ${importId} was not found.`);
  return record;
}

async function updateImport(importId: string, values: Partial<typeof imports.$inferInsert>): Promise<void> {
  await db.update(imports).set(values).where(eq(imports.id, importId));
}

async function readImportBuffer(record: ImportRecord): Promise<Buffer> {
  if (!record.storagePath || record.rawPurgedAt) {
    throw new Error("The raw upload is no longer available. Upload the CSV again.");
  }
  return storage.get(record.storagePath);
}

async function replaceImportRows(
  importId: string,
  orgId: string | null,
  rows: ValidatedRow[]
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(importRows).where(eq(importRows.importId, importId));
    const chunkSize = 200;
    for (let start = 0; start < rows.length; start += chunkSize) {
      const chunk = rows.slice(start, start + chunkSize).map((row) => ({
        importId,
        orgId,
        rowNumber: row.rowNumber,
        status: row.issues.some((issue) => issue.severity === "error") ? ("error" as const) : ("valid" as const),
        raw: row.normalized.sourceRow,
        normalized: row.normalized as unknown as Record<string, unknown>,
        issues: row.issues,
      }));
      if (chunk.length > 0) await tx.insert(importRows).values(chunk);
    }
  });
}

async function parseAndValidate(input: {
  record: ImportRecord;
  mapping: ImportMapping;
  scope: "lead" | "org";
}): Promise<{ summary: ReturnType<typeof validateRows>; rowCount: number }> {
  const buffer = await readImportBuffer(input.record);
  const { parsed } = inspectCsv(buffer);

  const orgLocations =
    input.scope === "org" && input.record.orgId
      ? await db
          .select({ name: locations.name })
          .from(locations)
          .where(eq(locations.orgId, input.record.orgId))
      : [];
  const orgProviders =
    input.scope === "org" && input.record.orgId
      ? await db
          .select({ name: providers.name })
          .from(providers)
          .where(eq(providers.orgId, input.record.orgId))
      : [];

  const summary = validateRows({
    parsed,
    mapping: input.mapping,
    options: {
      scope: input.scope,
      knownLocations: orgLocations.map((location) => location.name),
      knownProviders: orgProviders.map((provider) => provider.name),
      asOfDate: todayIso(),
    },
    today: todayIso(),
  });

  return { summary, rowCount: parsed.rows.length };
}

async function sendReportEmail(input: {
  to: string | null | undefined;
  practiceName: string;
  summary: AuditSummary;
  token: string;
  expiresAt: Date;
  pdf: Buffer;
}): Promise<void> {
  if (!input.to) return;
  try {
    const email = reportEmail({
      practiceName: input.practiceName,
      summary: input.summary,
      reportUrl: `${appUrl()}/audit/${input.token}`,
      expiresAt: input.expiresAt,
    });
    await getEmailAdapter().send({
      to: input.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: [
        {
          filename: "recallpilot-audit.pdf",
          content: input.pdf,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (error) {
    console.error("[email] could not send audit report", error);
  }
}

async function markLeadFailed(record: ImportRecord, auditId: string, message: string): Promise<void> {
  await updateImport(record.id, {
    status: "failed",
    stage: "failed",
    errorMessage: message,
    validCount: 0,
    errorCount: 0,
  });
  await db
    .update(audits)
    .set({ status: "failed" })
    .where(and(eq(audits.id, auditId), eq(audits.importId, record.id)));
  await purgeRaw(record);
  if (record.leadEmail) {
    try {
      await getEmailAdapter().send({
        to: record.leadEmail,
        subject: "We could not complete your RecallPilot audit",
        text: `We could not complete the audit for ${record.practiceName ?? "your practice"}. ${message}\n\nYou can try another file: ${appUrl()}/audit`,
        html: `<p>We could not complete the audit for ${record.practiceName ?? "your practice"}.</p><p>${message}</p><p><a href="${appUrl()}/audit">Try another file</a></p>`,
      });
    } catch (error) {
      console.error("[email] could not send failure email", error);
    }
  }
}

export async function processLeadAudit(payload: { auditId: string; importId: string }): Promise<void> {
  const record = await loadImport(payload.importId);
  const [audit] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, payload.auditId), eq(audits.importId, payload.importId)))
    .limit(1);
  if (!audit) throw new Error("Audit record not found.");

  try {
    await updateImport(record.id, { stage: "parsing", status: "validating" });
    const mapping = suggestMapping(record.headers ?? []);
    const mappingErrors = validateMapping(mapping, record.headers ?? []);
    if (mappingErrors.length > 0) {
      await markLeadFailed(record, audit.id, mappingErrors.join(" "));
      return;
    }

    const { summary: validation, rowCount } = await parseAndValidate({ record, mapping, scope: "lead" });
    await updateImport(record.id, {
      stage: "validating",
      mapping,
      rowCount,
      validCount: validation.validRows,
      errorCount: validation.errorRows,
    });
    await replaceImportRows(record.id, null, validation.rows);

    const summary = calculateAudit({
      rows: validation.rows,
      practiceName: record.practiceName,
      asOfDate: todayIso(),
    });

    await updateImport(record.id, { stage: "auditing" });
    const reportUrl = `${appUrl()}/audit/${audit.token}`;
    const pdf = await renderAuditPdf({ summary, reportUrl, expiresAt: audit.expiresAt });
    const pdfPath = `reports/${audit.id}.pdf`;

    await updateImport(record.id, { stage: "reporting" });
    await storage.put(pdfPath, pdf, "application/pdf");

    await db.transaction(async (tx) => {
      await tx
        .update(audits)
        .set({
          status: "completed",
          summary,
          assumptions: summary.assumptions,
          pdfPath,
          completedAt: new Date(),
        })
        .where(eq(audits.id, audit.id));
      await tx
        .update(imports)
        .set({
          status: "completed",
          stage: "completed",
          rowCount,
          validCount: validation.validRows,
          errorCount: validation.errorRows,
          mapping,
          stats: {
            encoding: record.encoding,
            delimiter: record.delimiter,
            rowCount,
            validCount: validation.validRows,
            errorCount: validation.errorRows,
          },
        })
        .where(eq(imports.id, record.id));
    });

    await sendReportEmail({
      to: record.leadEmail,
      practiceName: record.practiceName ?? summary.practiceName ?? "your practice",
      summary,
      token: audit.token,
      expiresAt: audit.expiresAt,
      pdf,
    });
    await updateImport(record.id, { stage: "purging" });
    await purgeRaw(record);
    await updateImport(record.id, { stage: "completed" });
  } catch (error) {
    console.error("[worker] lead audit failed", error);
    await markLeadFailed(record, audit.id, errorMessage(error));
  }
}

export async function validateOrgImport(importId: string): Promise<void> {
  const record = await loadImport(importId);
  if (!record.orgId) throw new Error("Organization import has no organization.");

  try {
    await updateImport(record.id, { status: "validating", stage: "parsing", errorMessage: null });
    const mappingErrors = validateMapping(record.mapping ?? {}, record.headers ?? []);
    if (mappingErrors.length > 0) {
      await updateImport(record.id, {
        status: "failed",
        stage: "failed",
        errorMessage: mappingErrors.join(" "),
      });
      return;
    }

    const { summary: validation, rowCount } = await parseAndValidate({
      record,
      mapping: record.mapping ?? {},
      scope: "org",
    });
    await updateImport(record.id, { stage: "validating" });
    await replaceImportRows(record.id, record.orgId, validation.rows);

    const failed = validation.validRows === 0;
    await updateImport(record.id, {
      status: failed ? "failed" : "ready",
      stage: failed ? "failed" : "ready",
      rowCount,
      validCount: validation.validRows,
      errorCount: validation.errorRows,
      errorMessage: failed ? "No valid rows found. Review the validation errors and adjust the mapping." : null,
      stats: {
        encoding: record.encoding,
        delimiter: record.delimiter,
        rowCount,
        validCount: validation.validRows,
        errorCount: validation.errorRows,
        warningCount: validation.warningRows,
        duplicateCount: validation.duplicateRows,
      },
    });
  } catch (error) {
    console.error("[worker] validate import failed", error);
    await updateImport(record.id, {
      status: "failed",
      stage: "failed",
      errorMessage: errorMessage(error),
    });
  }
}

function rowFromImportRow(row: {
  rowNumber: number;
  normalized: Record<string, unknown> | null;
  issues: RowIssue[];
}): ValidatedRow | null {
  if (!row.normalized) return null;
  return {
    rowNumber: row.rowNumber,
    normalized: row.normalized as unknown as NormalizedPatientRow,
    issues: row.issues ?? [],
  };
}

export async function commitOrgImport(importId: string): Promise<void> {
  const record = await loadImport(importId);
  if (!record.orgId) throw new Error("Organization import has no organization.");

  try {
    await updateImport(record.id, { status: "committing", stage: "committing", errorMessage: null });
    const [organization] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, record.orgId))
      .limit(1);
    const orgName = organization?.name ?? "Your practice";

    const rawRows = await db
      .select({
        rowNumber: importRows.rowNumber,
        normalized: importRows.normalized,
        issues: importRows.issues,
      })
      .from(importRows)
      .where(and(eq(importRows.importId, importId), eq(importRows.status, "valid")))
      .orderBy(asc(importRows.rowNumber));

    const validRows = rawRows
      .map((row) => rowFromImportRow(row))
      .filter((row): row is ValidatedRow => row !== null);
    if (validRows.length === 0) throw new Error("There are no valid rows to commit.");

    await commitNormalizedRows({
      orgId: record.orgId,
      importId,
      rows: validRows.map((row) => row.normalized),
    });

    const summary = calculateAudit({
      rows: validRows,
      practiceName: orgName,
      asOfDate: todayIso(),
    });
    const ttlDays = Number.parseInt(process.env.AUDIT_LINK_TTL_DAYS ?? "30", 10);
    const token = generateShareToken();
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const reportUrl = `${appUrl()}/audit/${token}`;
    const pdf = await renderAuditPdf({ summary, reportUrl, expiresAt });
    const auditId = randomUUID();
    const pdfPath = `reports/${auditId}.pdf`;
    await storage.put(pdfPath, pdf, "application/pdf");

    await db.transaction(async (tx) => {
      await tx.insert(audits).values({
        id: auditId,
        orgId: record.orgId,
        importId,
        practiceName: orgName,
        token,
        tokenPrefix: shareTokenPrefix(token),
        status: "completed",
        summary,
        assumptions: summary.assumptions,
        pdfPath,
        expiresAt,
        completedAt: new Date(),
      });
      await tx
        .update(imports)
        .set({
          status: "completed",
          stage: "completed",
          rowCount: record.rowCount,
          validCount: validRows.length,
          errorCount: record.errorCount,
        })
        .where(eq(imports.id, importId));
    });

    const [owner] = await db
      .select({ email: profiles.email })
      .from(memberships)
      .innerJoin(profiles, eq(profiles.id, memberships.userId))
      .where(and(eq(memberships.orgId, record.orgId), eq(memberships.role, "owner")))
      .limit(1);

    await sendReportEmail({
      to: owner?.email,
      practiceName: orgName,
      summary,
      token,
      expiresAt,
      pdf,
    });
    await purgeRaw(record);
  } catch (error) {
    console.error("[worker] commit import failed", error);
    await updateImport(record.id, {
      status: "failed",
      stage: "failed",
      errorMessage: errorMessage(error),
    });
  }
}


