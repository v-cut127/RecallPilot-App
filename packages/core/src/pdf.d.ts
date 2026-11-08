import type { AuditSummary } from "./types";
export declare function renderAuditPdf(input: {
    summary: AuditSummary;
    reportUrl: string;
    expiresAt: Date;
}): Promise<Buffer>;
