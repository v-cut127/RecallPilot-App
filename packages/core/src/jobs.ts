export const QUEUE_NAMES = {
  leadAudit: "audit.lead",
  validateImport: "import.validate",
  commitImport: "import.commit",
  purgeRaw: "purge.raw",
} as const;

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
