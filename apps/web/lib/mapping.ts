import { CANONICAL_FIELDS, type CanonicalField, type ImportMapping } from "@recallpilot/core";

export function sanitizeMapping(input: unknown): ImportMapping {
  if (!input || typeof input !== "object") return {};
  const mapping: ImportMapping = {};
  const allowed = new Set<string>(CANONICAL_FIELDS);
  for (const [field, column] of Object.entries(input as Record<string, unknown>)) {
    if (allowed.has(field) && typeof column === "string" && column.trim() !== "") {
      mapping[field as CanonicalField] = column;
    }
  }
  return mapping;
}
