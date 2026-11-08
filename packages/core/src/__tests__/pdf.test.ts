import { describe, expect, it } from "vitest";
import { calculateAudit } from "../audit";
import { renderAuditPdf } from "../pdf";
import type { NormalizedPatientRow, ValidatedRow } from "../types";

function sampleRow(id: string, lastVisitAt: string): ValidatedRow {
  const normalized: NormalizedPatientRow = {
    rowNumber: 2,
    externalId: id,
    patientKey: `ext:${id}`,
    firstName: "Anna",
    lastName: "Weber",
    email: "anna@example.test",
    phone: null,
    birthDate: null,
    lastVisitAt,
    nextRecallAt: null,
    recallIntervalMonths: null,
    treatmentType: "hygiene",
    treatmentRaw: "Hygiene",
    locationName: "Central Clinic",
    providerName: "Dr. Anna Weber",
    productionValue: null,
    consentEmail: true,
    consentSms: false,
    locale: "en",
    sourceRow: {},
  };
  return { rowNumber: 2, normalized, issues: [] };
}

describe("audit PDF", () => {
  it("renders a valid PDF with assumptions and disclaimer", async () => {
    const summary = calculateAudit({
      rows: [sampleRow("1", "2026-03-08")],
      asOfDate: "2026-11-08",
      generatedAt: "2026-11-08T10:00:00.000Z",
      practiceName: "Bright Dental Group",
    });
    const buffer = await renderAuditPdf({
      summary,
      reportUrl: "http://localhost:3000/audit/test-token",
      expiresAt: new Date("2026-12-08T10:00:00Z"),
    });
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(4_000);
  });
});
