export declare const QUEUE_NAMES: {
    readonly leadAudit: "audit.lead";
    readonly validateImport: "import.validate";
    readonly commitImport: "import.commit";
    readonly purgeRaw: "purge.raw";
};
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
export interface LeadAuditJob {
    auditId: string;
    importId: string;
}
export interface ValidateImportJob {
    importId: string;
}
export interface CommitImportJob {
    importId: string;
}
export interface PurgeRawJob {
    reason: "scheduled" | "after-audit";
}
export type JobPayloads = {
    [QUEUE_NAMES.leadAudit]: LeadAuditJob;
    [QUEUE_NAMES.validateImport]: ValidateImportJob;
    [QUEUE_NAMES.commitImport]: CommitImportJob;
    [QUEUE_NAMES.purgeRaw]: PurgeRawJob;
};
