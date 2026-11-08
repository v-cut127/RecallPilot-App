import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, getDb, imports, mappingProfiles } from "@recallpilot/db";
import { validateMapping } from "@recallpilot/core";
import { enqueue } from "@recallpilot/integrations/jobs";
import { QUEUE_NAMES } from "@recallpilot/core";
import { requireApiOrg } from "@/lib/api";
import { sanitizeMapping } from "@/lib/mapping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  mapping: z.record(z.string(), z.unknown()),
  profileName: z.string().trim().max(120).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOrg();
  if (!auth.context) return auth.response;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid mapping payload." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid mapping payload." }, { status: 400 });

  const mapping = sanitizeMapping(parsed.data.mapping);
  const db = getDb();
  const [record] = await db
    .select()
    .from(imports)
    .where(and(eq(imports.id, id), eq(imports.orgId, auth.context.organization.id)))
    .limit(1);
  if (!record) return NextResponse.json({ error: "Import not found." }, { status: 404 });
  if (record.status === "committing" || record.status === "completed") {
    return NextResponse.json({ error: "This import can no longer be re-mapped." }, { status: 409 });
  }

  const mappingErrors = validateMapping(mapping, record.headers ?? []);
  if (mappingErrors.length > 0) {
    return NextResponse.json({ error: mappingErrors.join(" "), details: mappingErrors }, { status: 400 });
  }

  let mappingProfileId: string | null = record.mappingProfileId;
  if (parsed.data.profileName) {
    const [profile] = await db
      .insert(mappingProfiles)
      .values({
        orgId: auth.context.organization.id,
        name: parsed.data.profileName,
        mapping,
      })
      .onConflictDoUpdate({
        target: [mappingProfiles.orgId, mappingProfiles.name],
        set: { mapping },
      })
      .returning({ id: mappingProfiles.id });
    mappingProfileId = profile?.id ?? null;
  }

  await db
    .update(imports)
    .set({
      mapping,
      mappingProfileId,
      status: "validating",
      stage: "queued",
      validCount: 0,
      errorCount: 0,
      errorMessage: null,
    })
    .where(eq(imports.id, id));

  await enqueue(QUEUE_NAMES.validateImport, { importId: id });
  return NextResponse.json({ status: "validating" }, { status: 202 });
}
