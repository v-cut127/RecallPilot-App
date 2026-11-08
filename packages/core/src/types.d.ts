export declare const TREATMENT_TYPES: readonly ["hygiene", "checkup", "treatment", "other"];
export type TreatmentType = (typeof TREATMENT_TYPES)[number];
export declare const TREATMENT_LABELS: Record<TreatmentType, string>;
export declare const SUPPORTED_LOCALES: readonly ["en", "de", "nl"];
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export declare const CANONICAL_FIELDS: readonly ["external_id", "first_name", "last_name", "full_name", "email", "phone", "birth_date", "last_visit_date", "next_recall_date", "recall_interval_months", "treatment_type", "location", "provider", "production_value", "consent_email", "consent_sms", "locale"];
export type CanonicalField = (typeof CANONICAL_FIELDS)[number];
export type ImportMapping = Partial<Record<CanonicalField, string>>;
export interface ImportDetection {
    encoding: "utf-8" | "windows-1252";
    hasBom: boolean;
    delimiter: "," | ";" | "\t" | "|";
    headers: string[];
    sampleRows: string[][];
    rowCount: number;
}
export interface ParsedCsvRow {
    rowNumber: number;
    values: string[];
    columnCountMismatch: boolean;
}
export interface ParsedCsv {
    headers: string[];
    rows: ParsedCsvRow[];
}
export interface NormalizedPatientRow {
    rowNumber: number;
    externalId: string | null;
    patientKey: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    birthDate: string | null;
    lastVisitAt: string | null;
    nextRecallAt: string | null;
    recallIntervalMonths: number | null;
    treatmentType: TreatmentType;
    treatmentRaw: string | null;
    locationName: string | null;
    providerName: string | null;
    productionValue: number | null;
    consentEmail: boolean;
    consentSms: boolean;
    locale: SupportedLocale;
    sourceRow: Record<string, string>;
}
export type RowIssueSeverity = "error" | "warning";
export type RowIssueCode = "missing_name" | "missing_date" | "missing_contact" | "missing_consent" | "invalid_email" | "invalid_phone" | "invalid_date" | "invalid_birth_date" | "invalid_number" | "invalid_interval" | "invalid_locale" | "future_date" | "unknown_location" | "unknown_provider" | "duplicate_in_file" | "duplicate_existing" | "column_count_mismatch" | "empty_row";
export interface RowIssue {
    field: CanonicalField | "row";
    code: RowIssueCode;
    message: string;
    severity: RowIssueSeverity;
}
export interface ValidatedRow {
    rowNumber: number;
    normalized: NormalizedPatientRow;
    issues: RowIssue[];
}
export interface ValidationSummary {
    rows: ValidatedRow[];
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
    duplicateRows: number;
}
export interface AuditCounts {
    totalPatients: number;
    overduePatients: number;
    lapsedPatients: number;
    dueNext30: number;
    insufficientData: number;
    missingContact: number;
    missingEmailConsent: number;
}
export interface ProductionEstimate {
    overdue: number;
    dueNext30: number;
    total: number;
    lapsedIncluded: number;
}
export interface TreatmentAudit {
    treatmentType: TreatmentType;
    label: string;
    overduePatients: number;
    lapsedPatients: number;
    dueNext30: number;
    estimatedProductionAtRisk: number;
    averageProductionAssumption: number;
}
export interface LocationAudit {
    locationName: string;
    totalPatients: number;
    overduePatients: number;
    dueNext30: number;
    estimatedProductionAtRisk: number;
}
export interface AuditAssumptionItem {
    key: string;
    label: string;
    value: string;
    description: string;
    kind: "interval" | "value" | "method" | "data";
}
export interface SampleMessage {
    treatmentType: TreatmentType;
    label: string;
    subject: string;
    body: string;
}
export interface AuditSummary {
    version: 1;
    generatedAt: string;
    asOfDate: string;
    currency: "EUR";
    practiceName: string | null;
    counts: AuditCounts;
    production: ProductionEstimate;
    byTreatment: TreatmentAudit[];
    byLocation: LocationAudit[];
    assumptions: AuditAssumptionItem[];
    sampleMessages: SampleMessage[];
    dataQuality: {
        rowsImported: number;
        rowsValid: number;
        rowsWithErrors: number;
        rowsWithWarnings: number;
        confidence: "directional" | "standard";
    };
    disclaimer: string;
}
export interface AuditDefaults {
    currency: "EUR";
    upcomingWindowDays: number;
    lapsedMinMonths: number;
    lapsedMaxMonths: number;
    confidenceMinPatients: number;
    defaultRecallIntervalMonths: Record<TreatmentType, number>;
    averageProduction: Record<TreatmentType, number>;
}
export declare const AUDIT_DEFAULTS: AuditDefaults;
export declare const AUDIT_DISCLAIMER = "This audit is a planning estimate. It is not a guarantee of revenue, a clinical assessment or a promise of insurance coverage. Every production figure is derived from the assumptions listed in this report.";
