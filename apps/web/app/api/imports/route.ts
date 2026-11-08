import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb, imports } from "@recallpilot/db";
import { inspectCsv, suggestMapping } from "@recallpilot/core";
import { getStorageAdapter } from "@recallpilot/integrations/storage";
import { requireApiOrg, safeFilename } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireApiOrg();
  if (!auth.context) return auth.response;
  const { context } = auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CSV file." }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "The file is larger than 20 MB." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let inspection: ReturnType<typeof inspectCsv>;
  try {
    inspection = inspectCsv(buffer, 10);
  } catch {
    return NextResponse.json({ error: "Could not parse this CSV. Check the delimiter and encoding." }, { status: 400 });
  }
  if (inspection.parsed.headers.length === 0 || inspection.parsed.rows.length === 0) {
    return NextResponse.json({ error: "The file has no data rows." }, { status: 400 });
  }

  const importId = randomUUID();
  const filename = safeFilename(file.name);
  const storageKey = `imports/orgs/${context.organization.id}/${importId}/${filename}`;
  const retentionHours = Number.parseInt(process.env.ORG_RAW_RETENTION_HOURS ?? "168", 10);
  const now = new Date();

  try {
    await getStorageAdapter().put(storageKey, buffer, file.type || "text/csv");
    const db = getDb();
    await db.insert(imports).values({
      id: importId,
      orgId: context.organization.id,
      filename,
      mimeType: file.type || "text/csv",
      sizeBytes: file.size,
      storagePath: storageKey,
      status: "uploaded",
      stage: "uploaded",
      delimiter: inspection.detection.delimiter,
      encoding: inspection.detection.encoding,
      hasBom: inspection.detection.hasBom,
      headers: inspection.detection.headers,
      rowCount: inspection.detection.rowCount,
      purgeAt: new Date(now.getTime() + retentionHours * 60 * 60 * 1000),
      stats: { locationNames: context.locations.map((location) => location.name) },
    });

    const suggested = suggestMapping(inspection.detection.headers);
    return NextResponse.json(
      {
        importId,
        detection: {
          encoding: inspection.detection.encoding,
          hasBom: inspection.detection.hasBom,
          delimiter: inspection.detection.delimiter,
          headers: inspection.detection.headers,
          rowCount: inspection.detection.rowCount,
          sampleRows: inspection.detection.sampleRows.slice(0, 5),
        },
        suggestedMapping: suggested,
      },
      { status: 201 }
    );
  } catch (error) {
    await getStorageAdapter().delete(storageKey).catch(() => undefined);
    console.error("[imports] upload failed", error);
    return NextResponse.json({ error: "Could not store the upload." }, { status: 500 });
  }
}
