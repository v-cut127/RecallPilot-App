import { format, addDays, addMonths, parseISO } from "date-fns";
import { buildPatientKey, type SupportedLocale, type TreatmentType } from "@recallpilot/core";

export interface SeededLocation {
  name: string;
  city: string;
  country: string;
  timezone: string;
  providers: string[];
}

export interface SyntheticRow {
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string | null;
  lastVisitAt: string | null;
  nextRecallAt: string | null;
  treatmentType: TreatmentType;
  treatmentRaw: string;
  intervalMonths: number | null;
  locationName: string;
  providerName: string;
  productionValue: number | null;
  consentEmail: boolean | null;
  consentSms: boolean | null;
  locale: SupportedLocale;
  rawBirthDate?: string;
  rawLastVisit?: string;
  rawNextRecall?: string;
  rawInterval?: string;
  rawProduction?: string;
}

export interface SyntheticClinic {
  locations: SeededLocation[];
  rows: SyntheticRow[];
  messyRows: SyntheticRow[];
  asOfDate: string;
}

export const DEMO_ORG = {
  name: "Bright Dental Group",
  slug: "bright-dental-group",
  country: "DE",
  locale: "en" as const,
  timezone: "Europe/Berlin",
  userEmail: "demo@recallpilot.test",
  userPassword: "DemoPass123!",
  userName: "Demo Practice Owner",
};

const firstNames = [
  "Anna",
  "Lukas",
  "Sophie",
  "Mark",
  "Emma",
  "Julia",
  "Thomas",
  "Laura",
  "David",
  "Nina",
  "Felix",
  "Sarah",
  "Jan",
  "Lisa",
  "Max",
  "Clara",
  "Paul",
  "Hannah",
  "Tom",
  "Eva",
  "Sem",
  "Sanne",
  "Daan",
  "Fleur",
  "Bram",
  "Lotte",
  "Milan",
  "Esmée",
  "Joris",
  "Maja",
];

const lastNames = [
  "Weber",
  "Fischer",
  "Schmidt",
  "Müller",
  "Schröder",
  "van Dijk",
  "Jansen",
  "de Vries",
  "Bakker",
  "Visser",
  "Wagner",
  "Becker",
  "Hoffmann",
  "Koch",
  "Richter",
  "Klein",
  "Wolf",
  "Neumann",
  "Schwarz",
  "Zimmermann",
  "Meijer",
  "Mulder",
  "Bos",
  "Vos",
  "Peters",
];

const locations: SeededLocation[] = [
  {
    name: "Central Clinic",
    city: "Berlin",
    country: "DE",
    timezone: "Europe/Berlin",
    providers: ["Dr. Anna Weber", "Sophie van Dijk"],
  },
  {
    name: "Riverside Practice",
    city: "Hamburg",
    country: "DE",
    timezone: "Europe/Berlin",
    providers: ["Dr. Lukas Fischer", "Emma de Vries"],
  },
  {
    name: "Northgate Dental",
    city: "Munich",
    country: "DE",
    timezone: "Europe/Berlin",
    providers: ["Dr. Mark Jansen"],
  },
];

function mulberry32(seed: number): () => number {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function transliterate(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".");
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)] as T;
}

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function defaultInterval(treatment: TreatmentType): number {
  if (treatment === "hygiene") return 6;
  if (treatment === "checkup") return 12;
  if (treatment === "treatment") return 12;
  return 12;
}

function treatmentRawValue(treatment: TreatmentType): string {
  switch (treatment) {
    case "hygiene":
      return "Hygiene";
    case "checkup":
      return "Check-up";
    case "treatment":
      return "Filling";
    default:
      return "Consultation";
  }
}

function chooseTreatment(rng: () => number): TreatmentType {
  const value = rng();
  if (value < 0.55) return "hygiene";
  if (value < 0.8) return "checkup";
  if (value < 0.95) return "treatment";
  return "other";
}

function chooseProduction(rng: () => number, treatment: TreatmentType): number | null {
  if (rng() < 0.4) return null;
  switch (treatment) {
    case "hygiene":
      return randomInt(rng, 90, 180);
    case "checkup":
      return randomInt(rng, 60, 150);
    case "treatment":
      return randomInt(rng, 250, 900);
    default:
      return randomInt(rng, 80, 200);
  }
}

export function generateSyntheticClinic(input?: {
  count?: number;
  seed?: number;
  asOfDate?: string;
}): SyntheticClinic {
  const count = input?.count ?? 2_500;
  const rng = mulberry32(input?.seed ?? 42);
  const asOfDate = input?.asOfDate ?? format(new Date(), "yyyy-MM-dd");
  const asOf = parseISO(asOfDate);
  const rows: SyntheticRow[] = [];

  for (let index = 0; index < count; index += 1) {
    const treatmentType = chooseTreatment(rng);
    const interval = defaultInterval(treatmentType);
    const explicitInterval = rng() < 0.35 ? interval : null;
    const effectiveInterval = explicitInterval ?? interval;
    const last = pick(rng, lastNames);
    const first = pick(rng, firstNames);
    const location = locations[Math.floor(rng() * locations.length)]!;
    const provider = pick(rng, location.providers);

    let lastVisitAt: string | null = null;
    let nextRecallAt: string | null = null;
    const bucket = rng();

    if (bucket < 0.32) {
      const overdueDays = randomInt(rng, effectiveInterval * 30 + 10, 600);
      lastVisitAt = format(addDays(asOf, -overdueDays), "yyyy-MM-dd");
    } else if (bucket < 0.42) {
      const months = randomInt(rng, 12, 23);
      lastVisitAt = format(addMonths(asOf, -months), "yyyy-MM-dd");
    } else if (bucket < 0.72) {
      const dueInDays = randomInt(rng, 0, 30);
      nextRecallAt = format(addDays(asOf, dueInDays), "yyyy-MM-dd");
      lastVisitAt = format(addMonths(parseISO(nextRecallAt), -effectiveInterval), "yyyy-MM-dd");
    } else if (bucket < 0.96) {
      const monthsAgo = randomInt(rng, 1, Math.max(1, effectiveInterval - 2));
      lastVisitAt = format(addMonths(asOf, -monthsAgo), "yyyy-MM-dd");
    } else {
      nextRecallAt = format(addDays(asOf, randomInt(rng, 120, 320)), "yyyy-MM-dd");
      const recentMonths = randomInt(rng, 1, Math.max(1, Math.min(effectiveInterval - 1, 5)));
      lastVisitAt = format(addMonths(asOf, -recentMonths), "yyyy-MM-dd");
    }

    const missingBothContacts = rng() < 0.05;
    let email = "";
    let phone = "";
    if (!missingBothContacts) {
      const emailRoll = rng();
      if (emailRoll < 0.85) {
        email = `${transliterate(first)}.${transliterate(last)}${index + 1}@example.test`;
      }
      if (rng() < 0.7) {
        phone = `+49 30 ${randomInt(rng, 1000000, 9999999)}`;
      }
    }

    const consentRoll = rng();
    const consentEmail = consentRoll < 0.68 ? true : consentRoll < 0.84 ? false : null;
    const smsRoll = rng();
    const consentSms = smsRoll < 0.45 ? true : smsRoll < 0.72 ? false : null;
    const localeRoll = rng();
    const locale: SupportedLocale = localeRoll < 0.6 ? "en" : localeRoll < 0.86 ? "de" : "nl";

    rows.push({
      externalId: `BD-${String(index + 1).padStart(5, "0")}`,
      firstName: first,
      lastName: last,
      email,
      phone,
      birthDate: rng() < 0.95 ? format(addDays(asOf, -randomInt(rng, 5000, 28000)), "yyyy-MM-dd") : null,
      lastVisitAt,
      nextRecallAt,
      treatmentType,
      treatmentRaw: treatmentRawValue(treatmentType),
      intervalMonths: explicitInterval,
      locationName: location.name,
      providerName: provider,
      productionValue: chooseProduction(rng, treatmentType),
      consentEmail,
      consentSms,
      locale,
    });
  }

  const base = rows[0]!;
  const messyRows: SyntheticRow[] = [
    { ...rows[1]!, rawLastVisit: "31.02.2024" },
    { ...rows[2]!, firstName: "", lastName: "" },
    { ...rows[3]!, email: "not-an-email", phone: "" },
    { ...rows[4]!, email: "", phone: "" },
    { ...rows[5]!, rawLastVisit: "2099-01-01" },
    { ...rows[6]!, locationName: "Atlantis Clinic" },
    { ...rows[7]!, providerName: "Dr. Nobody" },
    { ...rows[8]!, rawInterval: "0" },
    { ...rows[9]!, rawProduction: "-50" },
    { ...rows[10]!, lastVisitAt: null, nextRecallAt: null },
    { ...rows[11]!, rawBirthDate: "1800-13-40" },
    { ...rows[12]!, lastName: "Müller, Jr." },
    { ...rows[13]!, firstName: "=HYPERLINK(\"http://example.test\")", rawLastVisit: "not-a-date" },
    { ...rows[14]!, lastName: "van der Berg; Sr." },
    { ...base, externalId: "BD-00001" },
    { ...rows[15]!, externalId: "" },
    { ...rows[16]!, email: "sophie@example", phone: "" },
    { ...rows[17]!, nextRecallAt: null, lastVisitAt: null, rawNextRecall: "soon" },
    { ...rows[18]!, consentEmail: null, consentSms: null },
    { ...rows[19]!, rawLastVisit: "01.13.2024" },
  ];

  return { locations, rows, messyRows, asOfDate };
}

export function toNormalizedRows(clinic: SyntheticClinic) {
  return clinic.rows.map((row, index) => ({
    rowNumber: index + 2,
    externalId: row.externalId,
    patientKey: buildPatientKey({
      externalId: row.externalId,
      firstName: row.firstName,
      lastName: row.lastName,
      birthDate: row.birthDate,
      email: row.email || null,
      phone: row.phone || null,
    }),
    firstName: row.firstName || null,
    lastName: row.lastName || null,
    email: row.email || null,
    phone: row.phone || null,
    birthDate: row.birthDate,
    lastVisitAt: row.lastVisitAt,
    nextRecallAt: row.nextRecallAt,
    recallIntervalMonths: row.intervalMonths,
    treatmentType: row.treatmentType,
    treatmentRaw: row.treatmentRaw,
    locationName: row.locationName,
    providerName: row.providerName,
    productionValue: row.productionValue,
    consentEmail: row.consentEmail === true,
    consentSms: row.consentSms === true,
    locale: row.locale,
    sourceRow: {},
  }));
}

function csvCell(value: string | number | null | undefined, delimiter: string): string {
  const stringValue = value === null || value === undefined ? "" : String(value);
  if (stringValue.includes('"') || stringValue.includes(delimiter) || /[\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function isoOrRaw(row: SyntheticRow, field: "lastVisitAt" | "nextRecallAt" | "birthDate"): string {
  if (field === "lastVisitAt") return row.rawLastVisit ?? row.lastVisitAt ?? "";
  if (field === "nextRecallAt") return row.rawNextRecall ?? row.nextRecallAt ?? "";
  return row.rawBirthDate ?? row.birthDate ?? "";
}

function dmy(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function consentCell(value: boolean | null, variant: "comma" | "semicolon"): string {
  if (value === null) return "";
  if (variant === "comma") return value ? "Yes" : "No";
  return value ? "Ja" : "Nein";
}

export function serializeClinicCsv(clinic: SyntheticClinic, variant: "comma" | "semicolon"): string {
  const delimiter = variant === "comma" ? "," : ";";
  const headers =
    variant === "comma"
      ? [
          "Patient ID",
          "First Name",
          "Last Name",
          "Email",
          "Phone",
          "Date of Birth",
          "Last Visit",
          "Next Recall",
          "Treatment",
          "Recall Interval",
          "Location",
          "Provider",
          "Production",
          "Email Consent",
          "SMS Consent",
          "Language",
        ]
      : [
          "Patienten-ID",
          "Vorname",
          "Nachname",
          "E-Mail",
          "Telefon",
          "Geburtsdatum",
          "Letzter Besuch",
          "Nächste Kontrolle",
          "Behandlung",
          "Recall-Intervall",
          "Standort",
          "Behandler",
          "Umsatz",
          "E-Mail-Einwilligung",
          "SMS-Einwilligung",
          "Sprache",
        ];

  const allRows = [...clinic.rows, ...clinic.messyRows];
  const lines = [headers.map((header) => csvCell(header, delimiter)).join(delimiter)];

  for (const row of allRows) {
    const values: Array<string | number | null> = [
      row.externalId || null,
      row.firstName || null,
      row.lastName || null,
      row.email || null,
      row.phone || null,
      variant === "comma" ? isoOrRaw(row, "birthDate") : dmy(isoOrRaw(row, "birthDate")),
      variant === "comma" ? isoOrRaw(row, "lastVisitAt") : dmy(isoOrRaw(row, "lastVisitAt")),
      variant === "comma" ? isoOrRaw(row, "nextRecallAt") : dmy(isoOrRaw(row, "nextRecallAt")),
      row.treatmentRaw,
      row.rawInterval ?? row.intervalMonths,
      row.locationName,
      row.providerName,
      row.rawProduction ?? (row.productionValue === null ? null : variant === "comma" ? row.productionValue : row.productionValue.toFixed(2).replace(".", ",")),
      consentCell(row.consentEmail, variant),
      consentCell(row.consentSms, variant),
      row.locale,
    ];
    lines.push(values.map((value) => csvCell(value, delimiter)).join(delimiter));
  }

  const csv = `${lines.join("\r\n")}\r\n`;
  return variant === "comma" ? `\uFEFF${csv}` : csv;
}

export function csvBuffer(clinic: SyntheticClinic, variant: "comma" | "semicolon"): Buffer {
  const text = serializeClinicCsv(clinic, variant);
  return variant === "comma" ? Buffer.from(text, "utf8") : Buffer.from(text, "latin1");
}

export const SEED_AS_OF = "2026-11-08";
