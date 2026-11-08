import { describe, expect, it } from "vitest";
import { calculateAudit } from "../audit";
import type { NormalizedPatientRow, RowIssue, TreatmentType, ValidatedRow } from "../types";

function patient(overrides: Partial<NormalizedPatientRow> & { id: string }): NormalizedPatientRow {
  return {
    rowNumber: 2,
    externalId: overrides.id,
    patientKey: `ext:${overrides.id}`,
    firstName: "Test",
    lastName: "Patient",
    email: "test@example.test",
    phone: null,
    birthDate: null,
    lastVisitAt: null,
    nextRecallAt: null,
    recallIntervalMonths: null,
    treatmentType: "hygiene" as TreatmentType,
    treatmentRaw: null,
    locationName: "Central Clinic",
    providerName: null,
    productionValue: null,
    consentEmail: true,
    consentSms: false,
    locale: "en",
    sourceRow: {},
    ...overrides,
  };
}

function row(doctor: NormalizedPatientRow, issues: RowIssue[] = []): ValidatedRow {
  return { rowNumber: doctor.rowNumber, normalized: doctor, issues };
}

const asOf = "2026-11-08";

describe("audit calculation", () => {
  it("counts overdue hygiene, lapsed subset, due next 30 and excludes future recalls", () => {
    const rows: ValidatedRow[] = [
      row(patient({ id: "overdue", lastVisitAt: "2026-03-08" })),
      row(patient({ id: "lapsed", lastVisitAt: "2025-08-08" })),
      row(patient({ id: "due", treatmentType: "checkup", nextRecallAt: "2026-11-18" })),
      row(patient({ id: "later", treatmentType: "treatment", nextRecallAt: "2026-12-20" })),
      row(patient({ id: "recent", lastVisitAt: "2026-10-08" })),
    ];

    const summary = calculateAudit({ rows, asOfDate: asOf, generatedAt: "2026-11-08T10:00:00.000Z" });

    expect(summary.counts.totalPatients).toBe(5);
    expect(summary.counts.overduePatients).toBe(2);
    expect(summary.counts.lapsedPatients).toBe(1);
    expect(summary.counts.dueNext30).toBe(1);
    expect(summary.production.overdue).toBe(240);
    expect(summary.production.dueNext30).toBe(90);
    expect(summary.production.total).toBe(330);
    expect(summary.production.lapsedIncluded).toBe(120);
  });

  it("does not double count lapsed production", () => {
    const rows = [row(patient({ id: "lapsed", lastVisitAt: "2025-08-08" }))];
    const summary = calculateAudit({ rows, asOfDate: asOf });
    expect(summary.production.total).toBe(summary.production.overdue);
    expect(summary.production.lapsedIncluded).toBe(summary.production.overdue);
  });

  it("groups by treatment type and location", () => {
    const rows: ValidatedRow[] = [
      row(patient({ id: "h1", lastVisitAt: "2026-01-01", locationName: "Central Clinic" })),
      row(patient({ id: "h2", lastVisitAt: "2026-01-01", locationName: "Riverside Practice" })),
      row(
        patient({
          id: "t1",
          treatmentType: "treatment",
          lastVisitAt: "2025-10-01",
          locationName: "Central Clinic",
        })
      ),
    ];
    const summary = calculateAudit({ rows, asOfDate: asOf });
    const hygiene = summary.byTreatment.find((entry) => entry.treatmentType === "hygiene");
    const treatment = summary.byTreatment.find((entry) => entry.treatmentType === "treatment");
    expect(hygiene?.overduePatients).toBe(2);
    expect(hygiene?.estimatedProductionAtRisk).toBe(240);
    expect(treatment?.overduePatients).toBe(1);
    expect(treatment?.estimatedProductionAtRisk).toBe(450);
    expect(summary.byLocation.find((entry) => entry.locationName === "Central Clinic")?.estimatedProductionAtRisk).toBe(
      570
    );
  });

  it("excludes rows with validation errors", () => {
    const rows: ValidatedRow[] = [
      row(patient({ id: "bad", lastVisitAt: "2026-03-08" }), [
        { field: "email", code: "invalid_email", message: "bad", severity: "error" },
      ]),
      row(patient({ id: "good", lastVisitAt: "2026-03-08" })),
    ];
    const summary = calculateAudit({ rows, asOfDate: asOf });
    expect(summary.counts.totalPatients).toBe(1);
    expect(summary.dataQuality.rowsWithErrors).toBe(1);
  });

  it("marks small samples as directional", () => {
    const summary = calculateAudit({ rows: [row(patient({ id: "one", lastVisitAt: "2026-03-08" }))], asOfDate: asOf });
    expect(summary.dataQuality.confidence).toBe("directional");
  });

  it("labels production as assumption-based and includes every assumption", () => {
    const summary = calculateAudit({ rows: [row(patient({ id: "one", lastVisitAt: "2026-03-08" }))], asOfDate: asOf });
    const keys = summary.assumptions.map((assumption) => assumption.key);
    expect(keys).toEqual([
      "overdue",
      "recall_intervals",
      "upcoming_window",
      "lapsed",
      "average_production",
      "no_recovery_rate",
      "data_quality",
    ]);
    expect(summary.assumptions.find((item) => item.key === "average_production")?.value).toContain("€120");
    expect(summary.assumptions.find((item) => item.key === "no_recovery_rate")?.description).toContain(
      "does not assume a response rate"
    );
    expect(summary.disclaimer).toContain("planning estimate");
    expect(summary.sampleMessages.length).toBeGreaterThan(0);
  });

  it("counts missing contact and missing email consent", () => {
    const summary = calculateAudit({
      rows: [
        row(patient({ id: "a", lastVisitAt: "2026-03-08", email: null, phone: null, consentEmail: false })),
        row(patient({ id: "b", lastVisitAt: "2026-03-08" })),
      ],
      asOfDate: asOf,
    });
    expect(summary.counts.missingContact).toBe(1);
    expect(summary.counts.missingEmailConsent).toBe(1);
  });

  it("is deterministic when generatedAt is fixed", () => {
    const rows = [row(patient({ id: "a", lastVisitAt: "2026-03-08" }))];
    const first = calculateAudit({ rows, asOfDate: asOf, generatedAt: "2026-11-08T10:00:00.000Z" });
    const second = calculateAudit({ rows, asOfDate: asOf, generatedAt: "2026-11-08T10:00:00.000Z" });
    expect(first).toEqual(second);
  });
});
