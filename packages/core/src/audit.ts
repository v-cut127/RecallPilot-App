import { addDays, differenceInCalendarMonths, format, parseISO } from "date-fns";
import {
  AUDIT_DEFAULTS,
  AUDIT_DISCLAIMER,
  TREATMENT_LABELS,
  TREATMENT_TYPES,
  type AuditAssumptionItem,
  type AuditSummary,
  type LocationAudit,
  type SampleMessage,
  type TreatmentAudit,
  type TreatmentType,
  type ValidatedRow,
} from "./types";
import { effectiveRecallDueDate } from "./normalize";

export interface CalculateAuditInput {
  rows: ValidatedRow[];
  practiceName?: string | null;
  asOfDate?: string;
  generatedAt?: string;
  averageProduction?: Partial<Record<TreatmentType, number>>;
  defaultIntervals?: Partial<Record<TreatmentType, number>>;
  upcomingWindowDays?: number;
}

const sampleMessages: Record<TreatmentType, SampleMessage> = {
  hygiene: {
    treatmentType: "hygiene",
    label: "Hygiene recall",
    subject: "Time for your hygiene visit",
    body:
      "Hello {{first_name}}, our records show it has been a while since your last hygiene appointment. We have openings in the next two weeks. Reply to this email and we will help you find a time that works. If you would prefer not to receive recall emails, reply STOP.",
  },
  checkup: {
    treatmentType: "checkup",
    label: "Check-up recall",
    subject: "Your next check-up is due",
    body:
      "Hello {{first_name}}, your routine check-up is due. We can offer a morning or afternoon appointment. Reply to this email and our front desk will confirm a time. If you would prefer not to receive recall emails, reply STOP.",
  },
  treatment: {
    treatmentType: "treatment",
    label: "Treatment follow-up",
    subject: "Following up on your treatment plan",
    body:
      "Hello {{first_name}}, we are following up on the treatment plan discussed at your last visit. If you would like to arrange the next step, reply to this email and our team will help. Clinical questions are always answered by a member of the practice team. If you would prefer not to receive recall emails, reply STOP.",
  },
  other: {
    treatmentType: "other",
    label: "Recall follow-up",
    subject: "A note from your dental practice",
    body:
      "Hello {{first_name}}, we are checking in because your practice has an open recall. Reply to this email if you would like help arranging a visit. If you would prefer not to receive recall emails, reply STOP.",
  },
};

export function calculateAudit(input: CalculateAuditInput): AuditSummary {
  const asOfDate = input.asOfDate ?? format(new Date(), "yyyy-MM-dd");
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const upcomingWindowDays = input.upcomingWindowDays ?? AUDIT_DEFAULTS.upcomingWindowDays;
  const averageProduction = {
    ...AUDIT_DEFAULTS.averageProduction,
    ...(input.averageProduction ?? {}),
  };
  const defaultIntervals = {
    ...AUDIT_DEFAULTS.defaultRecallIntervalMonths,
    ...(input.defaultIntervals ?? {}),
  };

  const allRows = input.rows;
  const validRows = allRows.filter((row) => !row.issues.some((issue) => issue.severity === "error"));
  const rowsWithErrors = allRows.length - validRows.length;
  const rowsWithWarnings = allRows.filter((row) => row.issues.some((issue) => issue.severity === "warning")).length;

  const upcomingLimit = format(addDays(parseISO(asOfDate), upcomingWindowDays), "yyyy-MM-dd");

  const treatmentStats = new Map<
    TreatmentType,
    {
      overduePatients: number;
      lapsedPatients: number;
      dueNext30: number;
      productionOverdue: number;
      productionDueNext30: number;
    }
  >();
  for (const type of TREATMENT_TYPES) {
    treatmentStats.set(type, {
      overduePatients: 0,
      lapsedPatients: 0,
      dueNext30: 0,
      productionOverdue: 0,
      productionDueNext30: 0,
    });
  }

  const locationStats = new Map<
    string,
    { totalPatients: number; overduePatients: number; dueNext30: number; estimatedProductionAtRisk: number }
  >();

  let overduePatients = 0;
  let lapsedPatients = 0;
  let dueNext30 = 0;
  let insufficientData = 0;
  let missingContact = 0;
  let missingEmailConsent = 0;
  let productionOverdue = 0;
  let productionDueNext30 = 0;
  let productionLapsedIncluded = 0;

  for (const row of validRows) {
    const patient = row.normalized;
    const dueDate = effectiveRecallDueDate(patient, defaultIntervals);
    const typeStats = treatmentStats.get(patient.treatmentType);
    const locationName = patient.locationName?.trim() || "Unassigned";
    const location =
      locationStats.get(locationName) ??
      { totalPatients: 0, overduePatients: 0, dueNext30: 0, estimatedProductionAtRisk: 0 };
    location.totalPatients += 1;

    if (!patient.email && !patient.phone) missingContact += 1;
    if (!patient.consentEmail) missingEmailConsent += 1;

    if (!dueDate) {
      insufficientData += 1;
      locationStats.set(locationName, location);
      continue;
    }

    const isOverdue = dueDate < asOfDate;
    const isDueNext30 = !isOverdue && dueDate >= asOfDate && dueDate <= upcomingLimit;
    const lastVisitMonths = patient.lastVisitAt
      ? differenceInCalendarMonths(parseISO(asOfDate), parseISO(patient.lastVisitAt))
      : -1;
    const isLapsed =
      lastVisitMonths >= AUDIT_DEFAULTS.lapsedMinMonths && lastVisitMonths < AUDIT_DEFAULTS.lapsedMaxMonths;

    if (isOverdue) {
      overduePatients += 1;
      location.overduePatients += 1;
      const estimated = averageProduction[patient.treatmentType];
      productionOverdue += estimated;
      location.estimatedProductionAtRisk += estimated;
      if (typeStats) {
        typeStats.overduePatients += 1;
        typeStats.productionOverdue += estimated;
      }
      if (isLapsed) {
        lapsedPatients += 1;
        productionLapsedIncluded += estimated;
        if (typeStats) typeStats.lapsedPatients += 1;
      }
    } else if (isDueNext30) {
      dueNext30 += 1;
      location.dueNext30 += 1;
      const estimated = averageProduction[patient.treatmentType];
      productionDueNext30 += estimated;
      if (typeStats) {
        typeStats.dueNext30 += 1;
        typeStats.productionDueNext30 += estimated;
      }
    }

    locationStats.set(locationName, location);
  }

  const byTreatment: TreatmentAudit[] = TREATMENT_TYPES.map((type) => {
    const stats = treatmentStats.get(type)!;
    return {
      treatmentType: type,
      label: TREATMENT_LABELS[type],
      overduePatients: stats.overduePatients,
      lapsedPatients: stats.lapsedPatients,
      dueNext30: stats.dueNext30,
      estimatedProductionAtRisk: stats.productionOverdue + stats.productionDueNext30,
      averageProductionAssumption: averageProduction[type],
    };
  });

  const byLocation: LocationAudit[] = [...locationStats.entries()]
    .map(([locationName, stats]) => ({ locationName, ...stats }))
    .sort((a, b) => b.estimatedProductionAtRisk - a.estimatedProductionAtRisk || a.locationName.localeCompare(b.locationName));

  const assumptions: AuditAssumptionItem[] = [
    {
      key: "overdue",
      label: "Overdue definition",
      value: "Next recall date is before the audit date",
      description:
        "A patient is overdue when their next recall date is earlier than the audit date. A recall due today is counted as due soon, not overdue.",
      kind: "method",
    },
    {
      key: "recall_intervals",
      label: "Default recall intervals",
      value: `${defaultIntervals.hygiene} months hygiene · ${defaultIntervals.checkup} months check-up · ${defaultIntervals.treatment} months treatment`,
      description:
        "When the CSV does not contain a recall interval or an explicit next recall date, the audit uses these default intervals.",
      kind: "interval",
    },
    {
      key: "upcoming_window",
      label: "Due-next window",
      value: `${upcomingWindowDays} days`,
      description: "Due next 30 days includes recalls with a due date from the audit date through the next 30 days.",
      kind: "interval",
    },
    {
      key: "lapsed",
      label: "Lapsed definition",
      value: `${AUDIT_DEFAULTS.lapsedMinMonths}–${AUDIT_DEFAULTS.lapsedMaxMonths} months since last visit`,
      description:
        "Lapsed patients are a subset of overdue patients whose last completed visit was 12–24 months ago. Their production is included in the overdue total, not added to it.",
      kind: "method",
    },
    {
      key: "average_production",
      label: "Average production per visit",
      value: `Hygiene €${averageProduction.hygiene} · Check-up €${averageProduction.checkup} · Treatment €${averageProduction.treatment} · Other €${averageProduction.other}`,
      description:
        "Estimated production at risk multiplies the number of overdue or due-soon visits by these planning values. They are assumptions, not billing records.",
      kind: "value",
    },
    {
      key: "no_recovery_rate",
      label: "No recovery rate applied",
      value: "0% modelled",
      description:
        "This audit counts visits and represented production. It does not assume a response rate, booking rate or show-up rate, and it does not promise recovered revenue.",
      kind: "value",
    },
    {
      key: "data_quality",
      label: "Data quality",
      value: `${validRows.length} valid rows from ${allRows.length} imported rows`,
      description: `${rowsWithErrors} row(s) were excluded because of validation errors and ${rowsWithWarnings} row(s) have warnings. Invalid rows are downloadable with their reasons.`,
      kind: "data",
    },
  ];

  const activeTypes = TREATMENT_TYPES.filter((type) => {
    const stats = treatmentStats.get(type)!;
    return stats.overduePatients + stats.dueNext30 > 0;
  });
  const messageTypes = activeTypes.length > 0 ? activeTypes : (["hygiene"] as TreatmentType[]);

  const summary: AuditSummary = {
    version: 1,
    generatedAt,
    asOfDate,
    currency: "EUR",
    practiceName: input.practiceName?.trim() || null,
    counts: {
      totalPatients: validRows.length,
      overduePatients,
      lapsedPatients,
      dueNext30,
      insufficientData,
      missingContact,
      missingEmailConsent,
    },
    production: {
      overdue: productionOverdue,
      dueNext30: productionDueNext30,
      total: productionOverdue + productionDueNext30,
      lapsedIncluded: productionLapsedIncluded,
    },
    byTreatment,
    byLocation,
    assumptions,
    sampleMessages: messageTypes.map((type) => sampleMessages[type]),
    dataQuality: {
      rowsImported: allRows.length,
      rowsValid: validRows.length,
      rowsWithErrors,
      rowsWithWarnings,
      confidence: validRows.length >= AUDIT_DEFAULTS.confidenceMinPatients ? "standard" : "directional",
    },
    disclaimer: AUDIT_DISCLAIMER,
  };

  return summary;
}
