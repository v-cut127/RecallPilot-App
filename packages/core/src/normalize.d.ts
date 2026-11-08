import type { ImportMapping, NormalizedPatientRow, ParsedCsv, SupportedLocale, TreatmentType, ValidatedRow, ValidationSummary } from "./types";
export interface NormalizeOptions {
    scope: "org" | "lead";
    knownLocations?: string[];
    knownProviders?: string[];
    defaultLocale?: SupportedLocale;
    asOfDate?: string;
}
/**
 * Parses ISO dates and European DD.MM.YYYY / DD/MM/YYYY dates.
 * Returns undefined for an empty value and null for an invalid value.
 */
export declare function parseDate(value: string | null | undefined): string | null | undefined;
export declare function parseConsent(value: string | null | undefined): {
    granted: boolean;
    known: boolean;
};
export declare function parseDecimal(value: string | null | undefined): number | null | undefined;
export declare function normalizeEmail(value: string | null | undefined): string | null | undefined;
export declare function normalizePhone(value: string | null | undefined): string | null | undefined;
export declare function normalizeTreatment(value: string | null | undefined): TreatmentType;
export declare function normalizeLocale(value: string | null | undefined, fallback?: SupportedLocale): SupportedLocale;
export declare function buildPatientKey(input: {
    externalId: string | null;
    firstName: string | null;
    lastName: string | null;
    birthDate: string | null;
    email: string | null;
    phone: string | null;
}): string;
export declare function normalizeRow(input: {
    rowNumber: number;
    row: Record<string, string>;
    mapping: ImportMapping;
    options: NormalizeOptions;
    today?: string;
}): ValidatedRow;
export declare function validateRows(input: {
    parsed: ParsedCsv;
    mapping: ImportMapping;
    options: NormalizeOptions;
    existingKeys?: Set<string>;
    today?: string;
}): ValidationSummary;
export declare function buildValidationErrorCsv(summary: ValidationSummary): string;
export declare function effectiveRecallDueDate(row: Pick<NormalizedPatientRow, "lastVisitAt" | "nextRecallAt" | "recallIntervalMonths" | "treatmentType">, defaultIntervals: Record<TreatmentType, number>): string | null;
export declare function isDateValid(value: string): boolean;
