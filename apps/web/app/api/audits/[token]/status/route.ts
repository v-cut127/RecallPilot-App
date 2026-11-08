import { NextResponse } from "next/server";
import { eq, getDb, audits, imports } from "@recallpilot/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const [audit] = await db.select().from(audits).where(eq(audits.token, token)).limit(1);
  if (!audit) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const [importRecord] = audit.importId
    ? await db.select().from(imports).where(eq(imports.id, audit.importId)).limit(1)
    : [];

  return NextResponse.json({
    status: audit.status,
    stage: importRecord?.stage ?? (audit.status === "completed" ? "completed" : null),
    rowCount: importRecord?.rowCount ?? 0,
    validCount: importRecord?.validCount ?? 0,
    errorCount: importRecord?.errorCount ?? 0,
    errorMessage: importRecord?.errorMessage ?? null,
  });
}
