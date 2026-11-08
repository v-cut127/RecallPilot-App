import "./env";
import {
  and,
  eq,
  getDb,
  isNotNull,
  isNull,
  lt,
  lte,
  importRows,
  imports,
  type ImportRecord,
} from "@recallpilot/db";
import { getStorageAdapter } from "@recallpilot/integrations/storage";

const db = getDb();
const storage = getStorageAdapter();

export async function purgeRaw(record: ImportRecord): Promise<void> {
  try {
    if (record.storagePath && !record.rawPurgedAt) {
      await storage.delete(record.storagePath);
    }
    await db.update(imports).set({ rawPurgedAt: new Date() }).where(eq(imports.id, record.id));
  } catch (error) {
    console.error(`[purge] could not purge raw upload for ${record.id}`, error);
  }
}

export async function purgeExpiredUploads(): Promise<{ purged: number; rowsDeleted: number }> {
  const now = new Date();
  const expired = await db
    .select()
    .from(imports)
    .where(
      and(
        isNotNull(imports.storagePath),
        isNull(imports.rawPurgedAt),
        isNotNull(imports.purgeAt),
        lte(imports.purgeAt, now)
      )
    )
    .limit(200);

  for (const record of expired) {
    await purgeRaw(record);
  }

  const rowRetentionHours = Number.parseInt(process.env.LEAD_ROW_RETENTION_HOURS ?? "24", 10);
  const cutoff = new Date(now.getTime() - rowRetentionHours * 60 * 60 * 1000);
  const deleted = await db
    .delete(importRows)
    .where(and(isNull(importRows.orgId), lt(importRows.createdAt, cutoff)))
    .returning({ id: importRows.id });

  return { purged: expired.length, rowsDeleted: deleted.length };
}

export async function purgeImportRaw(importId: string): Promise<void> {
  const [record] = await db.select().from(imports).where(eq(imports.id, importId)).limit(1);
  if (!record) return;
  await purgeRaw(record);
}
