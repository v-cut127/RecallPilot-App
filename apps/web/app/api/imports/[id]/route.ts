import { NextResponse } from "next/server";
import { and, asc, eq, getDb, audits, importRows, imports } from "@recallpilot/db";
import { requireApiOrg } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOrg();
  if (!auth.context) return auth.response;
  const { id } = await params;
  const db = getDb();
  const [record] = await db
    .select()
    .from(imports)
    .where(and(eq(imports.id, id), eq(imports.orgId, auth.context.organization.id)))
    .limit(1);
  if (!record) return NextResponse.json({ error: "Import not found." }, { status: 404 });

  const errors = await db
    .select({
      rowNumber: importRows.rowNumber,
      issues: importRows.issues,
      normalized: importRows.normalized,
    })
    .from(importRows)
    .where(and(eq(importRows.importId, id), eq(importRows.status, "error")))
    .orderBy(asc(importRows.rowNumber))
    .limit(20);

  const preview = await db
    .select({
      rowNumber: importRows.rowNumber,
      normalized: importRows.normalized,
    })
    .from(importRows)
    .where(and(eq(importRows.importId, id), eq(importRows.status, "valid")))
    .orderBy(asc(importRows.rowNumber))
    .limit(10);

  const [audit] = record.status === "completed"
    ? await db.select({ token: audits.token }).from(audits).where(eq(audits.importId, id)).limit(1)
    : [];

  return NextResponse.json({
    id: record.id,
    filename: record.filename,
    status: record.status,
    stage: record.stage,
    delimiter: record.delimiter,
    encoding: record.encoding,
    headers: record.headers,
    mapping: record.mapping,
    rowCount: record.rowCount,
    validCount: record.validCount,
    errorCount: record.errorCount,
    errorMessage: record.errorMessage,
    rawPurgedAt: record.rawPurgedAt,
    errors,
    preview,
    auditToken: audit?.token ?? null,
  });
}
