import { NextResponse } from "next/server";
import { and, eq, getDb, imports } from "@recallpilot/db";
import { enqueue } from "@recallpilot/integrations/jobs";
import { QUEUE_NAMES } from "@recallpilot/core";
import { requireApiOrg } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (record.status !== "ready") {
    return NextResponse.json({ error: "Validate the import before committing it." }, { status: 409 });
  }
  if (record.validCount === 0) {
    return NextResponse.json({ error: "There are no valid rows to commit." }, { status: 400 });
  }

  await db.update(imports).set({ status: "committing", stage: "queued" }).where(eq(imports.id, id));
  await enqueue(QUEUE_NAMES.commitImport, { importId: id });
  return NextResponse.json({ status: "committing" }, { status: 202 });
}
