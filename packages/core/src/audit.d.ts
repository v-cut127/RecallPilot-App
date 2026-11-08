import { type AuditSummary, type TreatmentType, type ValidatedRow } from "./types";
export interface CalculateAuditInput {
    rows: ValidatedRow[];
    practiceName?: string | null;
    asOfDate?: string;
    generatedAt?: string;
    averageProduction?: Partial<Record<TreatmentType, number>>;
    defaultIntervals?: Partial<Record<TreatmentType, number>>;
    upcomingWindowDays?: number;
}
export declare function calculateAudit(input: CalculateAuditInput): AuditSummary;
