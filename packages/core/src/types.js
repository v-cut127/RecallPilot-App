export const TREATMENT_TYPES = ["hygiene", "checkup", "treatment", "other"];
export const TREATMENT_LABELS = {
    hygiene: "Hygiene",
    checkup: "Check-up",
    treatment: "Treatment",
    other: "Other",
};
export const SUPPORTED_LOCALES = ["en", "de", "nl"];
export const CANONICAL_FIELDS = [
    "external_id",
    "first_name",
    "last_name",
    "full_name",
    "email",
    "phone",
    "birth_date",
    "last_visit_date",
    "next_recall_date",
    "recall_interval_months",
    "treatment_type",
    "location",
    "provider",
    "production_value",
    "consent_email",
    "consent_sms",
    "locale",
];
export const AUDIT_DEFAULTS = {
    currency: "EUR",
    upcomingWindowDays: 30,
    lapsedMinMonths: 12,
    lapsedMaxMonths: 24,
    confidenceMinPatients: 50,
    defaultRecallIntervalMonths: {
        hygiene: 6,
        checkup: 12,
        treatment: 12,
        other: 12,
    },
    averageProduction: {
        hygiene: 120,
        checkup: 90,
        treatment: 450,
        other: 150,
    },
};
export const AUDIT_DISCLAIMER = "This audit is a planning estimate. It is not a guarantee of revenue, a clinical assessment or a promise of insurance coverage. Every production figure is derived from the assumptions listed in this report.";
//# sourceMappingURL=types.js.map