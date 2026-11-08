import { NextResponse } from "next/server";
import { eq, getDb, audits } from "@recallpilot/db";
import { isShareLinkActive } from "@recallpilot/core/share-token";
import { buildImportErrorsCsv } from "@/lib/import-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const [audit] = await db.select().from(audits).where(eq(audits.token, token)).limit(1);
  if (!audit) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  if (!isShareLinkActive({ expiresAt: audit.expiresAt, revokedAt: audit.revokedAt })) {
    return NextResponse.json({ error: "This report link expired or was revoked." }, { status: 410 });
  }
  if (!audit.importId) return NextResponse.json({ error: "No import is attached." }, { status: 404 });

  const csv = await buildImportErrorsCsv(audit.importId);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recallpilot-validation-errors.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
