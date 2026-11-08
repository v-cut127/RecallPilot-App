import "server-only";
import { asc, eq, getDb, importRows } from "@recallpilot/db";
import { buildCsv, type NormalizedPatientRow, type RowIssue } from "@recallpilot/core";

export async function buildImportErrorsCsv(importId: string): Promise<string> {
  const db = getDb();
  const rows = await db
    .select()
    .from(importRows)
    .where(eq(importRows.importId, importId))
    .orderBy(asc(importRows.rowNumber));

  const output: Array<Array<unknown>> = [];
  for (const row of rows) {
    const normalized = row.normalized as NormalizedPatientRow | null;
    const issues = (row.issues ?? []) as RowIssue[];
    for (const issue of issues) {
      output.push([
        row.rowNumber,
        issue.severity,
        issue.field,
        issue.code,
        issue.message,
        normalized?.patientKey ?? "",
        JSON.stringify(row.raw),
      ]);
    }
  }

  return buildCsv(["row_number", "severity", "field", "code", "message", "patient_key", "raw_row"], output);
}
