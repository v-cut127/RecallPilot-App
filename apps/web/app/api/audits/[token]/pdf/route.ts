import { NextResponse } from "next/server";
import { eq, getDb, audits } from "@recallpilot/db";
import { isShareLinkActive } from "@recallpilot/core/share-token";
import { getStorageAdapter } from "@recallpilot/integrations/storage";

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
  if (!audit.pdfPath) {
    return NextResponse.json({ error: "The PDF is not ready yet." }, { status: 404 });
  }

  try {
    const buffer = await getStorageAdapter().get(audit.pdfPath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recallpilot-audit-${audit.tokenPrefix ?? "report"}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "The PDF could not be loaded." }, { status: 500 });
  }
}
