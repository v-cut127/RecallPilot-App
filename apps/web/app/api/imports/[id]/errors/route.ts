import { NextResponse } from "next/server";
import { and, eq, getDb, imports } from "@recallpilot/db";
import { requireApiOrg } from "@/lib/api";
import { buildImportErrorsCsv } from "@/lib/import-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOrg();
  if (!auth.context) return auth.response;
  const { id } = await params;
  const db = getDb();
  const [record] = await db
    .select({ id: imports.id })
    .from(imports)
    .where(and(eq(imports.id, id), eq(imports.orgId, auth.context.organization.id)))
    .limit(1);
  if (!record) return NextResponse.json({ error: "Import not found." }, { status: 404 });

  const csv = await buildImportErrorsCsv(id);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recallpilot-validation-errors-${id}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
