import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, getDb, imports, audits } from "@recallpilot/db";
import { inspectCsv } from "@recallpilot/core";
import { generateShareToken, shareTokenPrefix } from "@recallpilot/core/share-token";
import { enqueue } from "@recallpilot/integrations/jobs";
import { QUEUE_NAMES } from "@recallpilot/core";
import { getStorageAdapter } from "@recallpilot/integrations/storage";
import { safeFilename } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

const leadSchema = z.object({
  email: z.string().trim().email().max(254),
  practiceName: z.string().trim().min(2).max(160),
  name: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwarded || request.headers.get("x-real-ip") || "local";
  const rate = checkRateLimit(`audit-lead:${clientKey}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many audits from this address. Try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse({
    email: formData.get("email"),
    practiceName: formData.get("practiceName"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and practice name." }, { status: 400 });
  }
  if (formData.get("consent") !== "yes") {
    return NextResponse.json({ error: "Confirm that we may email the report." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a CSV file." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "The file is larger than 20 MB." }, { status: 400 });
  }

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
  const auditId = randomUUID();
  const token = generateShareToken();
  const filename = safeFilename(file.name);
  const storageKey = `imports/leads/${importId}/${filename}`;
  const storage = getStorageAdapter();
  const now = new Date();
  const rawRetentionHours = Number.parseInt(process.env.LEAD_RAW_RETENTION_HOURS ?? "24", 10);
  const ttlDays = Number.parseInt(process.env.AUDIT_LINK_TTL_DAYS ?? "30", 10);

  try {
    await storage.put(storageKey, buffer, file.type || "text/csv");

    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(imports).values({
        id: importId,
        orgId: null,
        leadEmail: parsed.data.email,
        leadName: parsed.data.name ?? null,
        practiceName: parsed.data.practiceName,
        filename,
        mimeType: file.type || "text/csv",
        sizeBytes: file.size,
        storagePath: storageKey,
        status: "validating",
        stage: "uploaded",
        delimiter: inspection.detection.delimiter,
        encoding: inspection.detection.encoding,
        hasBom: inspection.detection.hasBom,
        headers: inspection.detection.headers,
        rowCount: inspection.detection.rowCount,
        purgeAt: new Date(now.getTime() + rawRetentionHours * 60 * 60 * 1000),
      });
      await tx.insert(audits).values({
        id: auditId,
        orgId: null,
        importId,
        leadEmail: parsed.data.email,
        practiceName: parsed.data.practiceName,
        token,
        tokenPrefix: shareTokenPrefix(token),
        status: "processing",
        expiresAt: new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000),
      });
    });

    await enqueue(QUEUE_NAMES.leadAudit, { auditId, importId });
    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    const db = getDb();
    await db
      .delete(audits)
      .where(and(eq(audits.id, auditId)))
      .catch(() => undefined);
    await db.delete(imports).where(eq(imports.id, importId)).catch(() => undefined);
    console.error("[audit-lead] failed", error);
    return NextResponse.json({ error: "Could not start the audit. Try again." }, { status: 500 });
  }
}
