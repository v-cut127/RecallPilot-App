import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AuditSummary, ImportMapping, RowIssue, SupportedLocale, TreatmentType } from "@recallpilot/core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    country: text("country").notNull().default("DE"),
    locale: text("locale").$type<SupportedLocale>().notNull().default("en"),
    timezone: text("timezone").notNull().default("Europe/Berlin"),
    createdBy: uuid("created_by"),
    createdAt: timestamps.createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("organizations_slug_key").on(table.slug)]
);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  fullName: text("full_name"),
  createdAt: timestamps.createdAt,
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: text("role").$type<"owner" | "admin" | "staff">().notNull().default("staff"),
    createdAt: timestamps.createdAt,
  },
  (table) => [uniqueIndex("memberships_org_user_key").on(table.orgId, table.userId)]
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    name: text("name").notNull(),
    city: text("city"),
    country: text("country"),
    timezone: text("timezone").notNull().default("Europe/Berlin"),
    createdAt: timestamps.createdAt,
  },
  (table) => [uniqueIndex("locations_org_name_key").on(table.orgId, table.name)]
);

export const providers = pgTable(
  "providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    locationId: uuid("location_id"),
    name: text("name").notNull(),
    specialty: text("specialty"),
    createdAt: timestamps.createdAt,
  },
  (table) => [uniqueIndex("providers_org_name_key").on(table.orgId, table.name)]
);

export const mappingProfiles = pgTable(
  "mapping_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    name: text("name").notNull(),
    pmsName: text("pms_name"),
    mapping: jsonb("mapping").$type<ImportMapping>().notNull().default({}),
    createdAt: timestamps.createdAt,
  },
  (table) => [uniqueIndex("mapping_profiles_org_name_key").on(table.orgId, table.name)]
);

export const imports = pgTable(
  "imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id"),
    leadEmail: text("lead_email"),
    leadName: text("lead_name"),
    practiceName: text("practice_name"),
    filename: text("filename").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    storagePath: text("storage_path"),
    status: text("status")
      .$type<"uploaded" | "validating" | "ready" | "committing" | "completed" | "failed">()
      .notNull()
      .default("uploaded"),
    stage: text("stage"),
    delimiter: text("delimiter"),
    encoding: text("encoding"),
    hasBom: boolean("has_bom").notNull().default(false),
    headers: jsonb("headers").$type<string[]>().notNull().default([]),
    mapping: jsonb("mapping").$type<ImportMapping>().notNull().default({}),
    mappingProfileId: uuid("mapping_profile_id"),
    rowCount: integer("row_count").notNull().default(0),
    validCount: integer("valid_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    stats: jsonb("stats").$type<Record<string, unknown>>().notNull().default({}),
    errorMessage: text("error_message"),
    purgeAt: timestamp("purge_at", { withTimezone: true }),
    rawPurgedAt: timestamp("raw_purged_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("imports_org_id_idx").on(table.orgId)]
);

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    locationId: uuid("location_id"),
    providerId: uuid("provider_id"),
    externalId: text("external_id"),
    patientKey: text("patient_key").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    birthDate: date("birth_date", { mode: "string" }),
    lastVisitAt: date("last_visit_at", { mode: "string" }),
    nextRecallAt: date("next_recall_at", { mode: "string" }),
    recallIntervalMonths: integer("recall_interval_months"),
    lastTreatmentType: text("last_treatment_type").$type<TreatmentType>().notNull().default("other"),
    locale: text("locale").$type<SupportedLocale>().notNull().default("en"),
    status: text("status").$type<"active" | "archived" | "deleted">().notNull().default("active"),
    sourceImportId: uuid("source_import_id"),
    createdAt: timestamps.createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("patients_org_patient_key").on(table.orgId, table.patientKey)]
);

export const patientChannelConsents = pgTable(
  "patient_channel_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    patientId: uuid("patient_id").notNull(),
    channel: text("channel").$type<"email" | "sms" | "whatsapp" | "voice">().notNull(),
    granted: boolean("granted").notNull().default(false),
    source: text("source"),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("consents_patient_channel_key").on(table.patientId, table.channel)]
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    patientId: uuid("patient_id").notNull(),
    locationId: uuid("location_id"),
    providerId: uuid("provider_id"),
    externalId: text("external_id"),
    treatmentType: text("treatment_type").$type<TreatmentType>().notNull().default("other"),
    status: text("status")
      .$type<"scheduled" | "completed" | "cancelled" | "no_show">()
      .notNull()
      .default("completed"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    productionValue: numeric("production_value", { precision: 10, scale: 2 }),
    sourceImportId: uuid("source_import_id"),
    createdAt: timestamps.createdAt,
  },
  (table) => [index("appointments_org_patient_idx").on(table.orgId, table.patientId)]
);

export const recallRules = pgTable("recall_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  locationId: uuid("location_id"),
  name: text("name").notNull(),
  treatmentType: text("treatment_type").$type<TreatmentType>().notNull().default("hygiene"),
  intervalMonths: integer("interval_months").notNull().default(6),
  active: boolean("active").notNull().default(true),
  createdAt: timestamps.createdAt,
});

export const importRows = pgTable("import_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  importId: uuid("import_id").notNull(),
  orgId: uuid("org_id"),
  rowNumber: integer("row_number").notNull(),
  status: text("status").$type<"valid" | "error">().notNull().default("valid"),
  raw: jsonb("raw").$type<Record<string, string>>().notNull().default({}),
  normalized: jsonb("normalized").$type<Record<string, unknown> | null>(),
  issues: jsonb("issues").$type<RowIssue[]>().notNull().default([]),
  createdAt: timestamps.createdAt,
});

export const audits = pgTable("audits", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id"),
  importId: uuid("import_id"),
  leadEmail: text("lead_email"),
  practiceName: text("practice_name"),
  token: text("token").notNull(),
  tokenPrefix: text("token_prefix"),
  status: text("status").$type<"processing" | "completed" | "failed">().notNull().default("processing"),
  summary: jsonb("summary").$type<AuditSummary | null>(),
  assumptions: jsonb("assumptions").$type<AuditSummary["assumptions"] | null>(),
  pdfPath: text("pdf_path"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamps.createdAt,
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id"),
  actorUserId: uuid("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamps.createdAt,
});

export const optOuts = pgTable("opt_outs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  patientId: uuid("patient_id"),
  channel: text("channel").$type<"email" | "sms" | "whatsapp" | "voice">().notNull(),
  reason: text("reason"),
  createdAt: timestamps.createdAt,
});

export type Organization = typeof organizations.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type ImportRecord = typeof imports.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type AuditRecord = typeof audits.$inferSelect;
export type ImportRow = typeof importRows.$inferSelect;
