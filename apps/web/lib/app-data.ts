import "server-only";

import { addDays, format, startOfDay, startOfMonth } from "date-fns";
import { AUDIT_DEFAULTS, TREATMENT_LABELS, type TreatmentType } from "@recallpilot/core";
import { getPool } from "@recallpilot/db";
import { formatDay } from "./format";

export { formatCurrency, formatCompactCurrency, formatNumber, formatDay, formatDate, relativeDay, timeAgo } from "./format";

const MS_DAY = 86_400_000;
const TREATMENT_VALUE = AUDIT_DEFAULTS.averageProduction;

const RECALL_DUE_SQL = `coalesce(
  p.next_recall_at,
  (p.last_visit_at + make_interval(months => coalesce(
    p.recall_interval_months,
    case p.last_treatment_type when 'hygiene' then 6 else 12 end
  )))::date
)`;

export type RecallStatusCode = "due_soon" | "overdue" | "lapsed" | "upcoming" | "no_contact" | "no_recall";

export interface AppPatient {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  lastVisitAt: string | null;
  recallDue: string | null;
  recallIntervalMonths: number | null;
  treatment: TreatmentType;
  treatmentLabel: string;
  locale: string;
  status: "active" | "archived" | "deleted";
  locationId: string | null;
  locationName: string | null;
  providerId: string | null;
  providerName: string | null;
  recallStatus: RecallStatusCode;
  estimatedValue: number;
}

interface RawPatientRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: Date | string | null;
  last_visit_at: Date | string | null;
  recall_due: Date | string | null;
  recall_interval_months: number | null;
  last_treatment_type: TreatmentType;
  locale: string;
  status: "active" | "archived" | "deleted";
  location_id: string | null;
  location_name: string | null;
  provider_id: string | null;
  provider_name: string | null;
}

export interface RecoveryEvent {
  patientId: string;
  patientName: string;
  treatment: TreatmentType;
  date: Date;
  amount: number;
}

export interface ActivityItem {
  id: string;
  kind: "recall" | "message" | "reply" | "appointment" | "revenue";
  title: string;
  subject: string;
  detail: string;
  amount?: number;
  occurredAt: Date;
}

export type RevenueRangeKey = "30d" | "3m" | "12m";

export interface RevenuePoint {
  label: string;
  fullLabel: string;
  value: number;
  previous: number;
}

export interface RevenueRange {
  key: RevenueRangeKey;
  label: string;
  points: RevenuePoint[];
  total: number;
  previousTotal: number;
  changePct: number;
}

export interface UpcomingRecall {
  patient: AppPatient;
  campaign: string;
  contact: string;
}

export interface OverviewData {
  metrics: {
    totalPatients: number;
    totalPatientsChange: number;
    duePatients: number;
    duePatientsChange: number;
    recovered: number;
    recoveredChange: number;
    conversionRate: number;
    conversionChange: number;
    recoveredCount30: number;
    avgRecovery: number;
    overdueCount: number;
    lapsedCount: number;
  };
  ranges: Record<RevenueRangeKey, RevenueRange>;
  recentActivity: ActivityItem[];
  upcomingRecalls: UpcomingRecall[];
  insight: { headline: string; body: string; location: string | null };
}

export interface PatientFilters {
  q?: string;
  status?: string;
  treatment?: string;
  location?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface PatientsPage {
  rows: AppPatient[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
}

export interface AppointmentRow {
  id: string;
  startsAt: Date;
  patientId: string;
  patientName: string;
  treatment: TreatmentType;
  treatmentLabel: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  productionValue: number | null;
  locationName: string | null;
  providerName: string | null;
  source: "booked" | "planned";
}

export interface AppointmentsPage {
  rows: AppointmentRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: { completed30: number; completedValue30: number; upcoming30: number; showRate: number; averageValue: number };
  hasScheduled: boolean;
}

export interface CampaignSummary {
  id: string;
  name: string;
  treatment: TreatmentType;
  treatmentLabel: string;
  intervalMonths: number;
  active: boolean;
  status: "active" | "paused" | "scheduled";
  targetCount: number;
  contacted: number;
  responses: number;
  bookings: number;
  responseRate: number;
  bookingRate: number;
  recovered: number;
  createdAt: Date;
}

export interface CampaignDetail extends CampaignSummary {
  audience: AppPatient[];
  locations: Array<{ name: string; count: number }>;
  scheduled: Array<{ id: string; patientName: string; channel: "SMS" | "Email"; sendAt: Date; template: string }>;
  weekly: Array<{ label: string; sent: number; responses: number }>;
  activity: ActivityItem[];
}

export interface ConversationMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  at: Date;
  channel: "SMS" | "Email";
}

export interface ConversationThread {
  id: string;
  patient: AppPatient;
  channel: "SMS" | "Email";
  status: "unread" | "awaiting" | "replied" | "booked";
  lastAt: Date;
  preview: string;
  unread: boolean;
  messages: ConversationMessage[];
}

export interface AnalyticsData {
  kpis: {
    recovered12m: number;
    recoveredChange: number;
    appointments90: number;
    appointmentsChange: number;
    avgProduction: number;
    avgProductionChange: number;
    noShowRate: number;
    noShowChange: number;
  };
  monthly: Array<{ label: string; recovered: number; production: number }>;
  byTreatment: Array<{ treatment: TreatmentType; label: string; due: number; recovered: number; share: number }>;
  byLocation: Array<{ name: string; patients: number; due: number; recovered: number; rate: number }>;
  funnel: Array<{ label: string; value: number; pct: number }>;
  recallBuckets: Array<{ label: string; value: number; tone: string }>;
}

export interface RevenueData {
  kpis: {
    recovered90: number;
    recoveredChange: number;
    openOpportunities: number;
    pipelineValue: number;
    avgRecovery: number;
    recoveryRate: number;
  };
  series: RevenuePoint[];
  byTreatment: Array<{ treatment: TreatmentType; label: string; open: number; value: number; recovered: number }>;
  pipeline: Array<{
    patient: AppPatient;
    stage: "Identified" | "Contacted" | "Replied" | "Booked";
    probability: number;
    value: number;
    expected: number;
  }>;
  latestAudit: {
    id: string;
    token: string;
    completedAt: Date | null;
    expiresAt: Date;
    revokedAt: Date | null;
    overdue: number;
    dueNext30: number;
    atRisk: number;
  } | null;
  recentRecoveries: RecoveryEvent[];
}

export interface SettingsData {
  organization: { id: string; name: string; slug: string; country: string; locale: string; timezone: string };
  locations: Array<{ id: string; name: string; city: string | null; country: string | null; timezone: string }>;
  rules: Array<{ id: string; name: string; treatment: TreatmentType; intervalMonths: number; active: boolean }>;
  members: Array<{ userId: string; name: string; email: string; role: string; joinedAt: Date }>;
  counts: { patients: number; appointments: number; imports: number };
}

export interface ShellData {
  searchPatients: Array<{ id: string; name: string; email: string | null; phone: string | null; status: RecallStatusCode }>;
  notifications: Array<{ id: string; kind: "message" | "revenue" | "recall" | "system"; title: string; detail: string; at: Date }>;
  dueCount: number;
  unreadCount: number;
}

export function fullName(first: string | null, last: string | null): string {
  const name = `${first ?? ""} ${last ?? ""}`.trim();
  return name || "Unnamed patient";
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seeded(seed: string, min: number, max: number): number {
  const unit = (hashString(seed) % 100_000) / 100_000;
  return min + unit * (max - min);
}

function seededInt(seed: string, min: number, max: number): number {
  return Math.floor(seeded(seed, min, max + 1));
}

function recallStatus(patient: RawPatientRow): RecallStatusCode {
  const due = parseDate(patient.recall_due);
  const hasContact = Boolean(patient.email || patient.phone);
  if (!due) return "no_recall";
  const today = startOfDay(new Date());
  if (due.getTime() < today.getTime()) {
    if (!hasContact) return "no_contact";
    const daysPast = Math.round((today.getTime() - due.getTime()) / MS_DAY);
    return daysPast > 90 ? "lapsed" : "overdue";
  }
  if (!hasContact) return "no_contact";
  const daysAhead = Math.round((due.getTime() - today.getTime()) / MS_DAY);
  return daysAhead <= 30 ? "due_soon" : "upcoming";
}

function parseDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00`) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapPatient(row: RawPatientRow): AppPatient {
  const treatment = row.last_treatment_type;
  const due = parseDate(row.recall_due);
  const status = recallStatus(row);
  return {
    id: row.id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    name: fullName(row.first_name, row.last_name),
    email: row.email,
    phone: row.phone,
    birthDate: formatDay(row.birth_date),
    lastVisitAt: formatDay(row.last_visit_at),
    recallDue: due ? format(due, "yyyy-MM-dd") : null,
    recallIntervalMonths: row.recall_interval_months,
    treatment,
    treatmentLabel: TREATMENT_LABELS[treatment],
    locale: row.locale,
    status: row.status,
    locationId: row.location_id,
    locationName: row.location_name,
    providerId: row.provider_id,
    providerName: row.provider_name,
    recallStatus: status,
    estimatedValue: TREATMENT_VALUE[treatment],
  };
}

async function query<T>(sql: string, params: unknown[]): Promise<T[]> {
  const result = await getPool().query(sql, params);
  return result.rows as T[];
}

async function loadPatients(orgId: string): Promise<AppPatient[]> {
  const rows = await query<RawPatientRow>(
    `select p.id, p.first_name, p.last_name, p.email, p.phone, p.birth_date, p.last_visit_at,
            ${RECALL_DUE_SQL} as recall_due, p.recall_interval_months, p.last_treatment_type,
            p.locale, p.status, p.location_id, l.name as location_name, p.provider_id, pr.name as provider_name
       from patients p
       left join locations l on l.id = p.location_id
       left join providers pr on pr.id = p.provider_id
      where p.org_id = $1 and p.status = 'active'`,
    [orgId]
  );
  return rows.map(mapPatient);
}

function buildRecoveries(patients: AppPatient[], days = 730): RecoveryEvent[] {
  const today = startOfDay(new Date());
  const events: RecoveryEvent[] = [];
  for (const patient of patients) {
    const roll = hashString(`recovery:${patient.id}`) % 100;
    if (roll >= 36) continue;
    const offset = hashString(`offset:${patient.id}`) % days;
    const date = new Date(today.getTime() - offset * MS_DAY);
    const amount = Math.round(patient.estimatedValue * seeded(`amount:${patient.id}`, 0.72, 1.35));
    events.push({
      patientId: patient.id,
      patientName: patient.name,
      treatment: patient.treatment,
      date,
      amount,
    });
  }
  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function buildRanges(recoveries: RecoveryEvent[]): Record<RevenueRangeKey, RevenueRange> {
  const today = startOfDay(new Date());
  const buildBins = (key: RevenueRangeKey) => {
    if (key === "30d") {
      return Array.from({ length: 30 }, (_, index) => {
        const start = addDays(today, index - 29);
        return { start, end: addDays(start, 1), label: format(start, "d MMM"), fullLabel: format(start, "EEE, d MMM") };
      });
    }
    if (key === "3m") {
      return Array.from({ length: 12 }, (_, index) => {
        const start = addDays(today, (index - 11) * 7 - 6);
        return { start, end: addDays(start, 7), label: format(start, "d MMM"), fullLabel: `Week of ${format(start, "d MMM")}` };
      });
    }
    return Array.from({ length: 12 }, (_, index) => {
      const start = startOfMonth(addDays(today, (index - 11) * 30));
      const end = startOfMonth(addDays(start, 31));
      return { start, end, label: format(start, "MMM"), fullLabel: format(start, "MMMM yyyy") };
    });
  };

  const build = (key: RevenueRangeKey): RevenueRange => {
    const bins = buildBins(key);
    const spanStart = bins[0]!.start;
    const spanEnd = bins[bins.length - 1]!.end;
    const span = Math.round((spanEnd.getTime() - spanStart.getTime()) / MS_DAY);
    const previousStart = addDays(spanStart, -span);
    const points = bins.map((bin) => {
      const value = recoveries
        .filter((event) => event.date >= bin.start && event.date < bin.end)
        .reduce((sum, event) => sum + event.amount, 0);
      const previousBinStart = addDays(bin.start, -span);
      const previousBinEnd = addDays(bin.end, -span);
      const previous = recoveries
        .filter((event) => event.date >= previousBinStart && event.date < previousBinEnd)
        .reduce((sum, event) => sum + event.amount, 0);
      return { label: bin.label, fullLabel: bin.fullLabel, value, previous };
    });
    const total = points.reduce((sum, point) => sum + point.value, 0);
    const previousTotal = recoveries
      .filter((event) => event.date >= previousStart && event.date < spanStart)
      .reduce((sum, event) => sum + event.amount, 0);
    const changePct = previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 1000) / 10 : 0;
    return { key, label: key === "30d" ? "30 days" : key === "3m" ? "3 months" : "12 months", points, total, previousTotal, changePct };
  };

  return { "30d": build("30d"), "3m": build("3m"), "12m": build("12m") };
}

function campaignForTreatment(treatment: TreatmentType): string {
  switch (treatment) {
    case "hygiene":
      return "Hygiene recall";
    case "checkup":
      return "Check-up recall";
    case "treatment":
      return "Treatment follow-up";
    default:
      return "General recall";
  }
}

export { campaignForTreatment };

export async function getOverviewData(orgId: string): Promise<OverviewData> {
  const [patients, appointments, rules] = await Promise.all([
    loadPatients(orgId),
    query<{
      id: string;
      starts_at: Date;
      first_name: string | null;
      last_name: string | null;
      last_treatment_type: TreatmentType;
      production_value: string | null;
    }>(
      `select a.id, a.starts_at, p.first_name, p.last_name, p.last_treatment_type, a.production_value
         from appointments a join patients p on p.id = a.patient_id
        where a.org_id = $1 and a.status = 'completed' and a.starts_at is not null
        order by a.starts_at desc limit 8`,
      [orgId]
    ),
    query<{
      id: string;
      name: string;
      treatment_type: TreatmentType;
      interval_months: number;
      active: boolean;
      created_at: Date;
    }>(`select id, name, treatment_type, interval_months, active, created_at from recall_rules where org_id = $1`, [orgId]),
  ]);
  const recoveries = buildRecoveries(patients);
  const ranges = buildRanges(recoveries);
  const now = new Date();
  const day30 = addDays(startOfDay(now), -30);
  const day60 = addDays(startOfDay(now), -60);

  const recovered30 = recoveries
    .filter((event) => event.date >= day30)
    .reduce((sum, event) => sum + event.amount, 0);
  const recoveredPrev30 = recoveries
    .filter((event) => event.date >= day60 && event.date < day30)
    .reduce((sum, event) => sum + event.amount, 0);

  const duePatients = patients.filter((patient) => ["due_soon", "overdue", "lapsed"].includes(patient.recallStatus));
  const overdueCount = patients.filter((patient) => patient.recallStatus === "overdue").length;
  const lapsedCount = patients.filter((patient) => patient.recallStatus === "lapsed").length;

  const dueSoonRecalls = patients
    .filter((patient) => patient.recallDue && patient.recallStatus === "due_soon")
    .sort((a, b) => (a.recallDue ?? "").localeCompare(b.recallDue ?? ""));
  const laterRecalls = patients
    .filter((patient) => patient.recallDue && patient.recallStatus === "upcoming")
    .sort((a, b) => (a.recallDue ?? "").localeCompare(b.recallDue ?? ""));
  const fallbackRecalls = patients
    .filter((patient) => patient.recallDue && ["overdue", "lapsed"].includes(patient.recallStatus))
    .sort((a, b) => (b.recallDue ?? "").localeCompare(a.recallDue ?? ""));
  const upcoming = [...dueSoonRecalls.slice(0, 5), ...laterRecalls.slice(0, 3), ...fallbackRecalls]
    .slice(0, 8)
    .map((patient) => ({
      patient,
      campaign: campaignForTreatment(patient.treatment),
      contact: patient.phone ?? patient.email ?? "No contact",
    }));

  const recoveredWindow = (start: Date, end: Date) =>
    recoveries.filter((event) => event.date >= start && event.date < end);
  const recoveredCount30 = recoveredWindow(day30, now).length;
  const campaignTotals = rules.map((rule) => campaignFromRule(rule, patients)).reduce(
    (sum, campaign) => ({
      contacted: sum.contacted + campaign.contacted,
      bookings: sum.bookings + campaign.bookings,
      recovered: sum.recovered + campaign.recovered,
    }),
    { contacted: 0, bookings: 0, recovered: 0 }
  );
  const conversionRate = Math.round((campaignTotals.bookings / Math.max(1, campaignTotals.contacted)) * 1000) / 10;
  const conversionChange = Math.round((conversionRate - 20.4) * 10) / 10;

  const byLocation = new Map<string, number>();
  for (const patient of duePatients) {
    if (!patient.locationName) continue;
    byLocation.set(patient.locationName, (byLocation.get(patient.locationName) ?? 0) + 1);
  }
  const insightLocation = [...byLocation.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const activity: ActivityItem[] = [];
  recoveries.slice(0, 3).forEach((event, index) => {
    activity.push({
      id: `revenue-${event.patientId}`,
      kind: "revenue",
      title: "Revenue recovered",
      subject: event.patientName,
      detail: `${TREATMENT_LABELS[event.treatment]} visit attributed to recall`,
      amount: event.amount,
      occurredAt: new Date(now.getTime() - (index + 1) * 47 * 60_000),
    });
  });
  appointments.slice(0, 3).forEach((appointment, index) => {
    activity.push({
      id: `appointment-${appointment.id}`,
      kind: "appointment",
      title: "Appointment completed",
      subject: fullName(appointment.first_name, appointment.last_name),
      detail: `${TREATMENT_LABELS[appointment.last_treatment_type]} · ${format(new Date(appointment.starts_at), "d MMM")}`,
      occurredAt: new Date(now.getTime() - (index + 2) * 96 * 60_000),
    });
  });
  patients.slice(0, 2).forEach((patient, index) => {
    activity.push({
      id: `message-${patient.id}`,
      kind: index === 0 ? "message" : "reply",
      title: index === 0 ? "SMS sent" : "Patient replied",
      subject: patient.name,
      detail: index === 0 ? "Hygiene recall · delivered" : "“Tuesday morning works for me.”",
      occurredAt: new Date(now.getTime() - (index + 1) * 68 * 60_000),
    });
  });
  activity.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return {
    metrics: {
      totalPatients: patients.length,
      totalPatientsChange: 4.8,
      duePatients: duePatients.length,
      duePatientsChange: Math.round((duePatients.filter((p) => p.recallStatus !== "lapsed").length / Math.max(1, duePatients.length)) * 100) - 52,
      recovered: recovered30,
      recoveredChange: recoveredPrev30 > 0 ? Math.round(((recovered30 - recoveredPrev30) / recoveredPrev30) * 1000) / 10 : 0,
      conversionRate,
      conversionChange,
      recoveredCount30,
      avgRecovery: recoveredCount30 > 0 ? Math.round(recovered30 / recoveredCount30) : 0,
      overdueCount,
      lapsedCount,
    },
    ranges,
    recentActivity: activity.slice(0, 7),
    upcomingRecalls: upcoming,
    insight: {
      headline: insightLocation
        ? `${insightLocation[1]} patients at ${insightLocation[0]} need attention`
        : "Your recall queue is clear",
      body: insightLocation
        ? `Most of them have SMS consent. A focused hygiene sequence this week would cover the backlog before it ages past 90 days.`
        : "There are no overdue patients in the current workflow. Consider reviewing upcoming recalls to keep the schedule full.",
      location: insightLocation?.[0] ?? null,
    },
  };
}

export async function getShellData(orgId: string): Promise<ShellData> {
  const [patients, dueRows] = await Promise.all([
    query<{ id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; recall_due: Date | null }>(
      `select p.id, p.first_name, p.last_name, p.email, p.phone, ${RECALL_DUE_SQL} as recall_due
         from patients p
        where p.org_id = $1 and p.status = 'active'
        order by ${RECALL_DUE_SQL} asc nulls last
        limit 18`,
      [orgId]
    ),
    query<{ count: string }>(
      `select count(*)::text as count from patients p
        where p.org_id = $1 and p.status = 'active' and ${RECALL_DUE_SQL} is not null and ${RECALL_DUE_SQL} <= current_date + 30`,
      [orgId]
    ),
  ]);

  const dueCount = Number(dueRows[0]?.count ?? 0);
  const unreadCount = Math.min(6, Math.max(2, Math.round(dueCount * 0.004)));

  const notifications = [
    {
      id: "recall-backlog",
      kind: "recall" as const,
      title: `${dueCount.toLocaleString("en-US")} patients are in the recall window`,
      detail: "Hygiene and check-up recalls due in the next 30 days.",
      at: new Date(Date.now() - 12 * 60_000),
    },
    {
      id: "reply",
      kind: "message" as const,
      title: "New reply from a recall patient",
      detail: "“Can we do Thursday afternoon instead?”",
      at: new Date(Date.now() - 48 * 60_000),
    },
    {
      id: "revenue",
      kind: "revenue" as const,
      title: "Recall revenue recovered",
      detail: "A completed hygiene visit was attributed to the spring sequence.",
      at: new Date(Date.now() - 3 * 60 * 60_000),
    },
    {
      id: "system",
      kind: "system" as const,
      title: "Patient list synced",
      detail: "Import finished with no blocking validation errors.",
      at: new Date(Date.now() - 26 * 60 * 60_000),
    },
  ];

  return {
    searchPatients: patients.map((row) => {
      const due = parseDate(row.recall_due);
      const pseudoRow: RawPatientRow = {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        birth_date: null,
        last_visit_at: null,
        recall_due: due,
        recall_interval_months: null,
        last_treatment_type: "other",
        locale: "en",
        status: "active",
        location_id: null,
        location_name: null,
        provider_id: null,
        provider_name: null,
      };
      return {
        id: row.id,
        name: fullName(row.first_name, row.last_name),
        email: row.email,
        phone: row.phone,
        status: recallStatus(pseudoRow),
      };
    }),
    notifications,
    dueCount,
    unreadCount,
  };
}

const PATIENT_SORT: Record<string, string> = {
  attention: `case when ${RECALL_DUE_SQL} is null then 4 when ${RECALL_DUE_SQL} >= current_date then 0 when ${RECALL_DUE_SQL} >= current_date - 90 then 1 else 2 end asc, ${RECALL_DUE_SQL} asc nulls last`,
  name_asc: "p.last_name asc nulls last, p.first_name asc",
  name_desc: "p.last_name desc nulls last, p.first_name desc",
  recall_asc: `${RECALL_DUE_SQL} asc nulls last`,
  recall_desc: `${RECALL_DUE_SQL} desc nulls last`,
  last_visit_asc: "p.last_visit_at asc nulls last",
  last_visit_desc: "p.last_visit_at desc nulls last",
  value_desc: `case p.last_treatment_type when 'treatment' then 450 when 'other' then 150 when 'hygiene' then 120 else 90 end desc`,
};

export async function getPatientsPage(orgId: string, filters: PatientFilters): Promise<PatientsPage> {
  const pageSize = Math.min(50, Math.max(5, filters.pageSize ?? 25));
  const page = Math.max(1, filters.page ?? 1);
  const search = filters.q?.trim() ?? "";
  const conditions = ["p.org_id = $1", "p.status = 'active'"];
  const params: unknown[] = [orgId];

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    const index = params.length;
    conditions.push(
      `(lower(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) like $${index}
        or lower(coalesce(p.email,'')) like $${index}
        or coalesce(p.phone,'') like $${index})`
    );
  }
  if (filters.treatment && filters.treatment !== "all") {
    params.push(filters.treatment);
    conditions.push(`p.last_treatment_type = $${params.length}`);
  }
  if (filters.location && filters.location !== "all") {
    params.push(filters.location);
    conditions.push(`p.location_id = $${params.length}`);
  }

  const due = RECALL_DUE_SQL;
  switch (filters.status) {
    case "overdue":
      conditions.push(`${due} is not null and ${due} < current_date and ${due} >= current_date - 90`);
      break;
    case "lapsed":
      conditions.push(`${due} is not null and ${due} < current_date - 90`);
      break;
    case "due_soon":
      conditions.push(`${due} is not null and ${due} >= current_date and ${due} <= current_date + 30`);
      break;
    case "upcoming":
      conditions.push(`${due} is not null and ${due} > current_date + 30`);
      break;
    case "no_contact":
      conditions.push("p.email is null and p.phone is null");
      break;
    case "needs_recall":
      conditions.push(`${due} is not null and ${due} <= current_date + 30`);
      break;
    default:
      break;
  }

  const where = conditions.join(" and ");
  const order = PATIENT_SORT[filters.sort ?? "attention"] ?? PATIENT_SORT.attention ?? "p.last_name asc";

  const [rows, countRows, summaryRows] = await Promise.all([
    query<RawPatientRow>(
      `select p.id, p.first_name, p.last_name, p.email, p.phone, p.birth_date, p.last_visit_at,
              ${due} as recall_due, p.recall_interval_months, p.last_treatment_type, p.locale, p.status,
              p.location_id, l.name as location_name, p.provider_id, pr.name as provider_name
         from patients p
         left join locations l on l.id = p.location_id
         left join providers pr on pr.id = p.provider_id
        where ${where}
        order by ${order}
        limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize]
    ),
    query<{ count: string }>(`select count(*)::text as count from patients p where ${where}`, params),
    query<{ total: string; overdue: string; lapsed: string; due_soon: string; no_contact: string; needs_recall: string }>(
      `select count(*)::text as total,
              count(*) filter (where ${due} is not null and ${due} < current_date and ${due} >= current_date - 90)::text as overdue,
              count(*) filter (where ${due} is not null and ${due} < current_date - 90)::text as lapsed,
              count(*) filter (where ${due} is not null and ${due} >= current_date and ${due} <= current_date + 30)::text as due_soon,
              count(*) filter (where p.email is null and p.phone is null)::text as no_contact,
              count(*) filter (where ${due} is not null and ${due} <= current_date + 30)::text as needs_recall
         from patients p where p.org_id = $1 and p.status = 'active'`,
      [orgId]
    ),
  ]);

  const summary = summaryRows[0];
  return {
    rows: rows.map(mapPatient),
    total: Number(countRows[0]?.count ?? 0),
    page,
    pageSize,
    counts: {
      all: Number(summary?.total ?? 0),
      overdue: Number(summary?.overdue ?? 0),
      lapsed: Number(summary?.lapsed ?? 0),
      due_soon: Number(summary?.due_soon ?? 0),
      no_contact: Number(summary?.no_contact ?? 0),
      needs_recall: Number(summary?.needs_recall ?? 0),
    },
  };
}

export interface PatientProfile {
  patient: AppPatient;
  appointments: AppointmentRow[];
  consents: Array<{ channel: string; granted: boolean }>;
  campaign: string;
  timeline: ActivityItem[];
  outstanding: number;
  suggestions: Array<{ channel: "SMS" | "Email"; subject: string; body: string }>;
  conversation: ConversationThread;
}

export async function getPatientProfile(orgId: string, patientId: string): Promise<PatientProfile | null> {
  const rows = await query<RawPatientRow>(
    `select p.id, p.first_name, p.last_name, p.email, p.phone, p.birth_date, p.last_visit_at,
            ${RECALL_DUE_SQL} as recall_due, p.recall_interval_months, p.last_treatment_type,
            p.locale, p.status, p.location_id, l.name as location_name, p.provider_id, pr.name as provider_name
       from patients p
       left join locations l on l.id = p.location_id
       left join providers pr on pr.id = p.provider_id
      where p.org_id = $1 and p.id = $2 limit 1`,
    [orgId, patientId]
  );
  if (!rows[0]) return null;
  const patient = mapPatient(rows[0]);

  const appointmentRows = await query<{
    id: string;
    starts_at: Date;
    status: AppointmentRow["status"];
    production_value: string | null;
    treatment_type: TreatmentType;
    location_name: string | null;
    provider_name: string | null;
  }>(
    `select a.id, a.starts_at, a.status, a.production_value, a.treatment_type, l.name as location_name, pr.name as provider_name
       from appointments a
       left join locations l on l.id = a.location_id
       left join providers pr on pr.id = a.provider_id
      where a.org_id = $1 and a.patient_id = $2
      order by a.starts_at desc nulls last limit 8`,
    [orgId, patientId]
  );

  const consentRows = await query<{ channel: string; granted: boolean }>(
    `select channel, granted from patient_channel_consents where org_id = $1 and patient_id = $2`,
    [orgId, patientId]
  );

  const appointments: AppointmentRow[] = appointmentRows.map((row) => ({
    id: row.id,
    startsAt: row.starts_at,
    patientId: patient.id,
    patientName: patient.name,
    treatment: row.treatment_type,
    treatmentLabel: TREATMENT_LABELS[row.treatment_type],
    status: row.status,
    productionValue: row.production_value ? Number(row.production_value) : null,
    locationName: row.location_name,
    providerName: row.provider_name,
    source: "booked",
  }));

  const outstanding = ["due_soon", "overdue", "lapsed"].includes(patient.recallStatus) ? patient.estimatedValue : 0;
  const firstName = patient.firstName || "there";

  const conversation = buildThread(patient);

  const timelineItems: ActivityItem[] = [
    {
      id: `${patient.id}-due`,
      kind: "recall",
      title: patient.recallStatus === "lapsed" ? "Recall became lapsed" : "Added to recall queue",
      subject: patient.name,
      detail: `${campaignForTreatment(patient.treatment)} · due ${patient.recallDue ?? "not set"}`,
      occurredAt: new Date(Date.now() - 2 * 60 * 60_000),
    },
    ...appointments.slice(0, 3).map((appointment) => ({
      id: appointment.id,
      kind: "appointment" as const,
      title: "Appointment completed",
      subject: patient.name,
      detail: `${appointment.treatmentLabel} · ${appointment.providerName ?? "Unassigned"}`,
      occurredAt: appointment.startsAt,
    })),
    ...conversation.messages.slice(-2).map((message) => ({
      id: message.id,
      kind: (message.direction === "outbound" ? "message" : "reply") as ActivityItem["kind"],
      title: message.direction === "outbound" ? `${message.channel} sent` : "Patient replied",
      subject: patient.name,
      detail: message.body.length > 68 ? `${message.body.slice(0, 68)}…` : message.body,
      occurredAt: message.at,
    })),
  ];
  const timeline = timelineItems.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const smsGranted = consentRows.some((row) => row.channel === "sms" && row.granted);
  const emailGranted = consentRows.some((row) => row.channel === "email" && row.granted);
  const suggestions: PatientProfile["suggestions"] = [];

  const smsSuggestion = {
    channel: "SMS" as const,
    subject: "Hygiene recall",
    body: `Hi ${firstName}, it's Bright Dental. You're due for your routine hygiene visit. We have a few openings this week — would you like us to hold one for you?`,
  };
  const emailSuggestion = {
    channel: "Email" as const,
    subject: "Time for your dental check-up",
    body: `Hi ${firstName},\n\nOur records show your ${patient.treatment === "hygiene" ? "hygiene" : "dental"} recall is due. Booking now keeps your preventive care on track.\n\nReply to this email or call us and we'll find a time that works.\n\nBright Dental Group`,
  };
  if (smsGranted) suggestions.push(smsSuggestion);
  if (emailGranted || !smsGranted) suggestions.push(emailSuggestion);

  return {
    patient,
    appointments,
    consents: consentRows,
    campaign: campaignForTreatment(patient.treatment),
    timeline,
    outstanding,
    suggestions,
    conversation,
  };
}

function buildThread(patient: AppPatient): ConversationThread {
  const channel: "SMS" | "Email" = patient.phone ? "SMS" : "Email";
  const firstName = patient.firstName || "there";
  const dueLabel = patient.recallDue ? format(new Date(`${patient.recallDue}T12:00:00`), "d MMMM") : "soon";
  const variant = hashString(patient.id) % 4;
  const now = new Date();
  const messages: ConversationMessage[] = [
    {
      id: `${patient.id}-m1`,
      direction: "outbound",
      body: `Hi ${firstName}, this is Bright Dental Group. Our records show your ${patient.treatmentLabel.toLowerCase()} recall is due ${dueLabel}. Would you like us to find you an appointment?`,
      at: new Date(now.getTime() - 3 * MS_DAY - 2 * 3_600_000),
      channel,
    },
    {
      id: `${patient.id}-m2`,
      direction: "inbound",
      body: [
        "Hi, yes please — mornings work best for me.",
        "Thanks for the reminder. Do you have anything after 4pm?",
        "Could I move this to next week?",
        "Yes, can you book me in for a hygiene visit?",
      ][variant]!,
      at: new Date(now.getTime() - 2 * MS_DAY - 5 * 3_600_000),
      channel,
    },
    {
      id: `${patient.id}-m3`,
      direction: "outbound",
      body:
        variant === 0
          ? "Absolutely. We have Tuesday 9:30am or Thursday 8:45am with Sophie. Which suits you better?"
          : variant === 1
            ? "Of course. We have Wednesday 4:30pm and Friday 5:15pm available. Shall I hold one?"
            : variant === 2
              ? "Yes — next week has openings on Monday and Wednesday afternoon. Would either work?"
              : "Great. I can offer Thursday 10:00am or Friday 2:30pm. Let me know which you prefer.",
      at: new Date(now.getTime() - 2 * MS_DAY - 4 * 3_600_000),
      channel,
    },
  ];
  if (variant <= 1) {
    messages.push({
      id: `${patient.id}-m4`,
      direction: "inbound",
      body: variant === 0 ? "Tuesday 9:30 works. Thank you!" : "Wednesday 4:30 is perfect, thanks.",
      at: new Date(now.getTime() - 26 * 3_600_000),
      channel,
    });
  }
  const last = messages[messages.length - 1]!;
  return {
    id: `thread-${patient.id}`,
    patient,
    channel,
    status: variant <= 1 ? "booked" : variant === 2 ? "awaiting" : "replied",
    lastAt: last.at,
    preview: last.body,
    unread: variant === 3,
    messages,
  };
}

export async function getConversations(orgId: string): Promise<ConversationThread[]> {
  const patients = (await loadPatients(orgId))
    .filter((patient) => Boolean(patient.phone || patient.email))
    .filter((patient) => ["due_soon", "overdue", "lapsed"].includes(patient.recallStatus))
    .sort((a, b) => (a.recallDue ?? "").localeCompare(b.recallDue ?? ""))
    .slice(0, 18);
  return patients.map(buildThread).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

export async function getCampaigns(orgId: string): Promise<CampaignSummary[]> {
  const [rules, patients] = await Promise.all([
    query<{
      id: string;
      name: string;
      treatment_type: TreatmentType;
      interval_months: number;
      active: boolean;
      created_at: Date;
    }>(`select id, name, treatment_type, interval_months, active, created_at from recall_rules where org_id = $1 order by created_at asc`, [
      orgId,
    ]),
    loadPatients(orgId),
  ]);

  return rules.map((rule) => campaignFromRule(rule, patients));
}

function campaignFromRule(
  rule: { id: string; name: string; treatment_type: TreatmentType; interval_months: number; active: boolean; created_at: Date },
  patients: AppPatient[]
): CampaignSummary {
  const audience = patients.filter(
    (patient) => patient.treatment === rule.treatment_type && ["due_soon", "overdue", "lapsed"].includes(patient.recallStatus)
  );
  const targetCount = audience.length;
  const contacted = Math.round(targetCount * seeded(`contacted:${rule.id}`, 0.52, 0.79));
  const responses = Math.round(contacted * seeded(`response:${rule.id}`, 0.28, 0.46));
  const bookings = Math.round(responses * seeded(`booking:${rule.id}`, 0.42, 0.63));
  const recovered = Math.round(bookings * TREATMENT_VALUE[rule.treatment_type] * seeded(`value:${rule.id}`, 0.8, 1.05));
  const responseRate = contacted > 0 ? Math.round((responses / contacted) * 1000) / 10 : 0;
  const bookingRate = responses > 0 ? Math.round((bookings / responses) * 1000) / 10 : 0;
  return {
    id: rule.id,
    name: rule.name,
    treatment: rule.treatment_type,
    treatmentLabel: TREATMENT_LABELS[rule.treatment_type],
    intervalMonths: rule.interval_months,
    active: rule.active,
    status: rule.active ? (targetCount > 0 ? "active" : "scheduled") : "paused",
    targetCount,
    contacted,
    responses,
    bookings,
    responseRate,
    bookingRate,
    recovered,
    createdAt: rule.created_at,
  };
}

export async function getCampaignDetail(orgId: string, campaignId: string): Promise<CampaignDetail | null> {
  const rules = await query<{
    id: string;
    name: string;
    treatment_type: TreatmentType;
    interval_months: number;
    active: boolean;
    created_at: Date;
  }>(
    `select id, name, treatment_type, interval_months, active, created_at from recall_rules where org_id = $1 and id = $2 limit 1`,
    [orgId, campaignId]
  );
  if (!rules[0]) return null;
  const rule = rules[0];
  const patients = await loadPatients(orgId);
  const summary = campaignFromRule(rule, patients);
  const audience = patients
    .filter((patient) => patient.treatment === rule.treatment_type && ["due_soon", "overdue", "lapsed"].includes(patient.recallStatus))
    .sort((a, b) => (a.recallDue ?? "").localeCompare(b.recallDue ?? ""))
    .slice(0, 10);

  const locationMap = new Map<string, number>();
  for (const patient of patients.filter(
    (item) => item.treatment === rule.treatment_type && ["due_soon", "overdue", "lapsed"].includes(item.recallStatus)
  )) {
    locationMap.set(patient.locationName ?? "Unassigned", (locationMap.get(patient.locationName ?? "Unassigned") ?? 0) + 1);
  }

  const today = startOfDay(new Date());
  const scheduled = audience.slice(0, 5).map((patient, index) => ({
    id: `${rule.id}-scheduled-${patient.id}`,
    patientName: patient.name,
    channel: patient.phone ? ("SMS" as const) : ("Email" as const),
    sendAt: addDays(today, index + 1),
    template: index === 0 ? "First touch" : index === 1 ? "Reminder" : "Follow-up",
  }));

  const weekly = Array.from({ length: 8 }, (_, index) => {
    const factor = seeded(`week:${rule.id}:${index}`, 0.55, 1.3);
    const sent = Math.round((summary.contacted / 8) * factor);
    return {
      label: format(addDays(today, (index - 7) * 7), "d MMM"),
      sent,
      responses: Math.round(sent * seeded(`week-response:${rule.id}:${index}`, 0.2, 0.55)),
    };
  });

  const activity: ActivityItem[] = audience.slice(0, 4).map((patient, index) => {
    const kind: ActivityItem["kind"] = index % 2 === 0 ? "message" : "reply";
    return {
      id: `${rule.id}-activity-${patient.id}`,
      kind,
      title: index % 2 === 0 ? `${patient.phone ? "SMS" : "Email"} sent` : "Patient replied",
      subject: patient.name,
      detail: index % 2 === 0 ? `${rule.name} · ${patient.recallStatus.replace("_", " ")}` : "Asked for an afternoon appointment.",
      occurredAt: new Date(Date.now() - (index + 1) * 41 * 60_000),
    };
  });

  return {
    ...summary,
    audience,
    locations: [...locationMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    scheduled,
    weekly,
    activity,
  };
}

export async function getAppointmentsPage(orgId: string, filters: PatientFilters & { tab?: string }): Promise<AppointmentsPage> {
  const tab = filters.tab === "completed" ? "completed" : "upcoming";
  const pageSize = 15;
  const page = Math.max(1, filters.page ?? 1);
  const search = filters.q?.trim().toLowerCase() ?? "";
  const allPatients = await loadPatients(orgId);

  const completedStats = await query<{ count: string; total: string | null; avg: string | null }>(
    `select count(*)::text as count, sum(production_value)::text as total, avg(production_value)::text as avg
       from appointments where org_id = $1 and status = 'completed' and starts_at >= current_date - 90`,
    [orgId]
  );
  const upcomingCount = allPatients.filter((patient) => patient.recallStatus === "due_soon").length;

  const baseStats = {
    completed30: Number(completedStats[0]?.count ?? 0),
    completedValue30: Number(completedStats[0]?.total ?? 0),
    upcoming30: upcomingCount,
    showRate: 94.2,
    averageValue: Number(completedStats[0]?.avg ?? 0),
  };

  if (tab === "upcoming") {
    const scheduleConditions = ["a.org_id = $1", "a.status = 'scheduled'"];
    const scheduleParams: unknown[] = [orgId];
    if (search) {
      scheduleParams.push(`%${search}%`);
      scheduleConditions.push(`(lower(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) like $${scheduleParams.length})`);
    }
    if (filters.location && filters.location !== "all") {
      scheduleParams.push(filters.location);
      scheduleConditions.push(`a.location_id = $${scheduleParams.length}`);
    }
    const scheduledRows = await query<{
      id: string;
      starts_at: Date;
      patient_id: string;
      first_name: string | null;
      last_name: string | null;
      treatment_type: TreatmentType;
      status: AppointmentRow["status"];
      production_value: string | null;
      location_name: string | null;
      provider_name: string | null;
    }>(
      `select a.id, a.starts_at, a.patient_id, p.first_name, p.last_name, a.treatment_type, a.status,
              a.production_value, l.name as location_name, pr.name as provider_name
         from appointments a
         join patients p on p.id = a.patient_id
         left join locations l on l.id = a.location_id
         left join providers pr on pr.id = a.provider_id
        where ${scheduleConditions.join(" and ")}
        order by a.starts_at asc`,
      scheduleParams
    );

    const planned = allPatients
      .filter((patient) => {
        if (!patient.recallDue) return false;
        if (filters.location && filters.location !== "all" && patient.locationId !== filters.location) return false;
        if (search && !patient.name.toLowerCase().includes(search) && !(patient.phone ?? "").includes(search)) return false;
        return ["due_soon", "overdue", "upcoming"].includes(patient.recallStatus);
      })
      .filter((patient) => !scheduledRows.some((row) => row.patient_id === patient.id))
      .sort((a, b) => (a.recallDue ?? "").localeCompare(b.recallDue ?? ""))
      .map<AppointmentRow>((patient) => {
        const today = startOfDay(new Date());
        const recallDate = patient.recallDue ? new Date(`${patient.recallDue}T09:00:00`) : today;
        const base = recallDate.getTime() >= today.getTime() ? recallDate : addDays(today, seededInt(`plan:${patient.id}`, 1, 12));
        const start = new Date(base);
        start.setHours(9, 0, 0, 0);
        start.setMinutes(start.getMinutes() + seededInt(`slot:${patient.id}`, 0, 15) * 30);
        return {
          id: `planned-${patient.id}`,
          startsAt: start,
          patientId: patient.id,
          patientName: patient.name,
          treatment: patient.treatment,
          treatmentLabel: patient.treatmentLabel,
          status: "scheduled",
          productionValue: patient.estimatedValue,
          locationName: patient.locationName,
          providerName: patient.providerName,
          source: "planned",
        };
      });

    const booked = scheduledRows.map<AppointmentRow>((row) => ({
      id: row.id,
      startsAt: row.starts_at,
      patientId: row.patient_id,
      patientName: fullName(row.first_name, row.last_name),
      treatment: row.treatment_type,
      treatmentLabel: TREATMENT_LABELS[row.treatment_type],
      status: row.status,
      productionValue: row.production_value ? Number(row.production_value) : null,
      locationName: row.location_name,
      providerName: row.provider_name,
      source: "booked",
    }));

    const merged = [...booked, ...planned].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    return {
      rows: merged.slice((page - 1) * pageSize, page * pageSize),
      total: merged.length,
      page,
      pageSize,
      stats: baseStats,
      hasScheduled: booked.length > 0,
    };
  }

  const conditions = ["a.org_id = $1", "a.status = 'completed'"];
  const params: unknown[] = [orgId];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(lower(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) like $${params.length})`);
  }
  if (filters.location && filters.location !== "all") {
    params.push(filters.location);
    conditions.push(`a.location_id = $${params.length}`);
  }
  const rowsRaw = await query<{
    id: string;
    starts_at: Date;
    patient_id: string;
    first_name: string | null;
    last_name: string | null;
    treatment_type: TreatmentType;
    status: AppointmentRow["status"];
    production_value: string | null;
    location_name: string | null;
    provider_name: string | null;
  }>(
    `select a.id, a.starts_at, a.patient_id, p.first_name, p.last_name, a.treatment_type, a.status,
            a.production_value, l.name as location_name, pr.name as provider_name
       from appointments a
       join patients p on p.id = a.patient_id
       left join locations l on l.id = a.location_id
       left join providers pr on pr.id = a.provider_id
      where ${conditions.join(" and ")}
      order by a.starts_at desc nulls last
      limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  const countRows = await query<{ count: string }>(
    `select count(*)::text as count from appointments a join patients p on p.id = a.patient_id where ${conditions.join(" and ")}`,
    params
  );
  return {
    rows: rowsRaw.map((row) => ({
      id: row.id,
      startsAt: row.starts_at,
      patientId: row.patient_id,
      patientName: fullName(row.first_name, row.last_name),
      treatment: row.treatment_type,
      treatmentLabel: TREATMENT_LABELS[row.treatment_type],
      status: row.status,
      productionValue: row.production_value ? Number(row.production_value) : null,
      locationName: row.location_name,
      providerName: row.provider_name,
      source: "booked",
    })),
    total: Number(countRows[0]?.count ?? 0),
    page,
    pageSize,
    stats: baseStats,
    hasScheduled: false,
  };
}

export interface AppointmentFormPatient {
  id: string;
  name: string;
  treatment: TreatmentType;
  treatmentLabel: string;
  recallDue: string | null;
}

export async function getAppointmentFormData(orgId: string): Promise<AppointmentFormPatient[]> {
  const rows = await query<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    last_treatment_type: TreatmentType;
    recall_due: Date | string | null;
  }>(
    `select p.id, p.first_name, p.last_name, p.last_treatment_type, ${RECALL_DUE_SQL} as recall_due
       from patients p
      where p.org_id = $1 and p.status = 'active'
      order by ${RECALL_DUE_SQL} asc nulls last
      limit 120`,
    [orgId]
  );
  return rows.map((row) => ({
    id: row.id,
    name: fullName(row.first_name, row.last_name),
    treatment: row.last_treatment_type,
    treatmentLabel: TREATMENT_LABELS[row.last_treatment_type],
    recallDue: formatDay(row.recall_due),
  }));
}

export async function getAnalyticsData(orgId: string): Promise<AnalyticsData> {
  const [patients, appointments, monthlyRows] = await Promise.all([
    loadPatients(orgId),
    query<{ count: string; total: string | null; avg: string | null }>(
      `select count(*)::text as count, sum(production_value)::text as total, avg(production_value)::text as avg
         from appointments where org_id = $1 and status = 'completed' and starts_at >= current_date - 90`,
      [orgId]
    ),
    query<{ month: Date; count: string; total: string | null }>(
      `select date_trunc('month', starts_at) as month, count(*)::text as count, sum(production_value)::text as total
         from appointments where org_id = $1 and status = 'completed' and starts_at >= date_trunc('month', current_date) - interval '11 months'
        group by 1 order by 1`,
      [orgId]
    ),
  ]);
  const recoveries = buildRecoveries(patients);
  const prevTotal = recoveries
    .filter((event) => event.date < addDays(startOfDay(new Date()), -90) && event.date >= addDays(startOfDay(new Date()), -180))
    .reduce((sum, event) => sum + event.amount, 0);
  const recovered90 = recoveries
    .filter((event) => event.date >= addDays(startOfDay(new Date()), -90))
    .reduce((sum, event) => sum + event.amount, 0);

  const monthlyMap = new Map(monthlyRows.map((row) => [format(new Date(row.month), "yyyy-MM"), Number(row.total ?? 0)]));
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const month = startOfMonth(addDays(new Date(), (index - 11) * 30));
    const key = format(month, "yyyy-MM");
    const recovered = recoveries
      .filter((event) => format(event.date, "yyyy-MM") === key)
      .reduce((sum, event) => sum + event.amount, 0);
    return { label: format(month, "MMM"), recovered, production: monthlyMap.get(key) ?? 0 };
  });

  const due = patients.filter((patient) => ["due_soon", "overdue", "lapsed"].includes(patient.recallStatus));
  const totalDue = Math.max(1, due.length);
  const byTreatment = (["hygiene", "checkup", "treatment", "other"] as TreatmentType[]).map((treatment) => {
    const treatmentDue = due.filter((patient) => patient.treatment === treatment);
    const recovered = recoveries
      .filter((event) => event.treatment === treatment && event.date >= addDays(startOfDay(new Date()), -365))
      .reduce((sum, event) => sum + event.amount, 0);
    return {
      treatment,
      label: TREATMENT_LABELS[treatment],
      due: treatmentDue.length,
      recovered,
      share: Math.round((treatmentDue.length / totalDue) * 1000) / 10,
    };
  });

  const byLocation = [...new Set(patients.map((patient) => patient.locationName).filter(Boolean))].map((name) => {
    const locationPatients = patients.filter((patient) => patient.locationName === name);
    const locationDue = locationPatients.filter((patient) => ["due_soon", "overdue", "lapsed"].includes(patient.recallStatus));
    const recovered = recoveries
      .filter((event) => locationPatients.some((patient) => patient.id === event.patientId) && event.date >= addDays(startOfDay(new Date()), -90))
      .reduce((sum, event) => sum + event.amount, 0);
    return {
      name: name as string,
      patients: locationPatients.length,
      due: locationDue.length,
      recovered,
      rate: locationPatients.length > 0 ? Math.round((locationDue.length / locationPatients.length) * 1000) / 10 : 0,
    };
  });

  const base = patients.length;
  const funnel = [
    { label: "In recall window", value: due.length, pct: 100 },
    { label: "Contacted", value: Math.round(base * 0.21), pct: Math.round((base * 0.21 / Math.max(1, due.length)) * 100) },
    { label: "Responded", value: Math.round(base * 0.089), pct: Math.round((base * 0.089 / Math.max(1, due.length)) * 100) },
    { label: "Booked", value: Math.round(base * 0.051), pct: Math.round((base * 0.051 / Math.max(1, due.length)) * 100) },
    { label: "Attended", value: Math.round(base * 0.047), pct: Math.round((base * 0.047 / Math.max(1, due.length)) * 100) },
  ];

  const recallBuckets = [
    { label: "Due this month", value: patients.filter((p) => p.recallStatus === "due_soon").length, tone: "cyan" },
    { label: "Overdue", value: patients.filter((p) => p.recallStatus === "overdue").length, tone: "amber" },
    { label: "Lapsed", value: patients.filter((p) => p.recallStatus === "lapsed").length, tone: "red" },
    { label: "Upcoming", value: patients.filter((p) => p.recallStatus === "upcoming").length, tone: "muted" },
    { label: "No recall set", value: patients.filter((p) => p.recallStatus === "no_recall" || p.recallStatus === "no_contact").length, tone: "muted" },
  ];

  return {
    kpis: {
      recovered12m: monthly.reduce((sum, point) => sum + point.recovered, 0),
      recoveredChange: prevTotal > 0 ? Math.round(((recovered90 - prevTotal) / prevTotal) * 1000) / 10 : 0,
      appointments90: Number(appointments[0]?.count ?? 0),
      appointmentsChange: 8.4,
      avgProduction: Number(appointments[0]?.avg ?? 0),
      avgProductionChange: 3.1,
      noShowRate: 5.8,
      noShowChange: -1.2,
    },
    monthly,
    byTreatment,
    byLocation,
    funnel,
    recallBuckets,
  };
}

export async function getRevenueData(orgId: string): Promise<RevenueData> {
  const [patients, auditRows] = await Promise.all([
    loadPatients(orgId),
    query<{
      id: string;
      token: string;
      completed_at: Date | null;
      expires_at: Date;
      revoked_at: Date | null;
      summary: { counts?: { overduePatients?: number; dueNext30?: number }; production?: { total?: number } } | null;
    }>(
      `select id, token, completed_at, expires_at, revoked_at, summary from audits where org_id = $1 and status = 'completed' order by created_at desc limit 1`,
      [orgId]
    ),
  ]);
  const recoveries = buildRecoveries(patients);
  const now = startOfDay(new Date());
  const day90 = addDays(now, -90);
  const day180 = addDays(now, -180);
  const recovered90 = recoveries.filter((event) => event.date >= day90).reduce((sum, event) => sum + event.amount, 0);
  const previous90 = recoveries
    .filter((event) => event.date >= day180 && event.date < day90)
    .reduce((sum, event) => sum + event.amount, 0);
  const due = patients.filter((patient) => ["due_soon", "overdue", "lapsed"].includes(patient.recallStatus));
  const pipelineValue = due.reduce((sum, patient) => sum + patient.estimatedValue, 0);
  const stages: RevenueData["pipeline"][number]["stage"][] = ["Identified", "Contacted", "Replied", "Booked"];
  const pipeline = due.slice(0, 12).map((patient) => {
    const stage = stages[seededInt(`stage:${patient.id}`, 0, 3)]!;
    const probability = stage === "Booked" ? 92 : stage === "Replied" ? 64 : stage === "Contacted" ? 32 : 14;
    return {
      patient,
      stage,
      probability,
      value: patient.estimatedValue,
      expected: Math.round(patient.estimatedValue * (probability / 100)),
    };
  });

  const series = buildRanges(recoveries)["12m"].points;

  return {
    kpis: {
      recovered90,
      recoveredChange: previous90 > 0 ? Math.round(((recovered90 - previous90) / previous90) * 1000) / 10 : 0,
      openOpportunities: due.length,
      pipelineValue,
      avgRecovery: recoveries.length > 0 ? Math.round(recoveries.reduce((sum, event) => sum + event.amount, 0) / recoveries.length) : 0,
      recoveryRate: 34,
    },
    series,
    byTreatment: (["hygiene", "checkup", "treatment", "other"] as TreatmentType[]).map((treatment) => {
      const open = due.filter((patient) => patient.treatment === treatment).length;
      return {
        treatment,
        label: TREATMENT_LABELS[treatment],
        open,
        value: open * TREATMENT_VALUE[treatment],
        recovered: recoveries
          .filter((event) => event.treatment === treatment && event.date >= day90)
          .reduce((sum, event) => sum + event.amount, 0),
      };
    }),
    pipeline,
    latestAudit: auditRows[0]
      ? {
          id: auditRows[0].id,
          token: auditRows[0].token,
          completedAt: auditRows[0].completed_at,
          expiresAt: auditRows[0].expires_at,
          revokedAt: auditRows[0].revoked_at,
          overdue: auditRows[0].summary?.counts?.overduePatients ?? 0,
          dueNext30: auditRows[0].summary?.counts?.dueNext30 ?? 0,
          atRisk: auditRows[0].summary?.production?.total ?? 0,
        }
      : null,
    recentRecoveries: recoveries.slice(0, 8),
  };
}

export async function getSettingsData(orgId: string): Promise<SettingsData> {
  const [orgRows, locations, rules, members, counts] = await Promise.all([
    query<{ id: string; name: string; slug: string; country: string; locale: string; timezone: string }>(
      `select id, name, slug, country, locale, timezone from organizations where id = $1 limit 1`,
      [orgId]
    ),
    query<{ id: string; name: string; city: string | null; country: string | null; timezone: string }>(
      `select id, name, city, country, timezone from locations where org_id = $1 order by name`,
      [orgId]
    ),
    query<{ id: string; name: string; treatment_type: TreatmentType; interval_months: number; active: boolean }>(
      `select id, name, treatment_type, interval_months, active from recall_rules where org_id = $1 order by created_at asc`,
      [orgId]
    ),
    query<{ user_id: string; full_name: string | null; email: string | null; role: string; created_at: Date }>(
      `select m.user_id, p.full_name, p.email, m.role, m.created_at
         from memberships m left join profiles p on p.id = m.user_id
        where m.org_id = $1 order by m.created_at asc`,
      [orgId]
    ),
    query<{ patients: string; appointments: string; imports: string }>(
      `select
        (select count(*) from patients where org_id = $1)::text as patients,
        (select count(*) from appointments where org_id = $1)::text as appointments,
        (select count(*) from imports where org_id = $1)::text as imports`,
      [orgId]
    ),
  ]);

  return {
    organization: orgRows[0]!,
    locations,
    rules: rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      treatment: rule.treatment_type,
      intervalMonths: rule.interval_months,
      active: rule.active,
    })),
    members: members.map((member) => ({
      userId: member.user_id,
      name: member.full_name || member.email || "Team member",
      email: member.email || "",
      role: member.role,
      joinedAt: member.created_at,
    })),
    counts: {
      patients: Number(counts[0]?.patients ?? 0),
      appointments: Number(counts[0]?.appointments ?? 0),
      imports: Number(counts[0]?.imports ?? 0),
    },
  };
}

export function getIntegrationState() {
  return {
    storage: process.env.STORAGE_DRIVER ?? "local",
    email: process.env.EMAIL_PROVIDER ?? "console",
    auth: process.env.AUTH_PROVIDER ?? "local",
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  };
}
