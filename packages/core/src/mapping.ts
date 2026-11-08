import type { CanonicalField, ImportMapping } from "./types";

export interface CanonicalFieldDefinition {
  field: CanonicalField;
  label: string;
  description: string;
  required?: boolean;
}

export const CANONICAL_FIELD_DEFINITIONS: CanonicalFieldDefinition[] = [
  { field: "external_id", label: "Patient ID", description: "Stable ID from the practice system. Used for safe re-imports." },
  { field: "first_name", label: "First name", description: "Patient first name." },
  { field: "last_name", label: "Last name", description: "Patient last name." },
  { field: "full_name", label: "Full name", description: "Use when the export has one combined name column." },
  { field: "email", label: "Email", description: "Used for the email channel and future recall messages." },
  { field: "phone", label: "Phone", description: "Optional. Stored for future SMS or call workflows." },
  { field: "birth_date", label: "Date of birth", description: "Optional. Improves duplicate detection." },
  { field: "last_visit_date", label: "Last visit", description: "Date of the most recent completed visit." },
  { field: "next_recall_date", label: "Next recall due", description: "Use when the practice system stores an explicit due date." },
  { field: "recall_interval_months", label: "Recall interval (months)", description: "Optional. Overrides the default interval." },
  { field: "treatment_type", label: "Treatment type", description: "Hygiene, check-up, treatment or other." },
  { field: "location", label: "Location", description: "Practice location name." },
  { field: "provider", label: "Provider", description: "Dentist or hygienist name." },
  { field: "production_value", label: "Production value", description: "Optional visit value in EUR." },
  { field: "consent_email", label: "Email consent", description: "Explicit consent for email recall messages." },
  { field: "consent_sms", label: "SMS consent", description: "Explicit consent for SMS recall messages." },
  { field: "locale", label: "Language", description: "Patient language. Stored now, used when outreach ships." },
];

export const REQUIRED_MAPPING_FIELDS: CanonicalField[] = [];

type AliasMap = Partial<Record<CanonicalField, string[]>>;

const aliases: AliasMap = {
  external_id: [
    "patient id",
    "patientid",
    "patient_id",
    "external id",
    "externalid",
    "id",
    "patient number",
    "patient no",
    "patient nr",
    "patientennummer",
    "patientennr",
    "patienten id",
    "patientnummer",
    "klantnummer",
    "pid",
    "dossier",
    "file number",
  ],
  first_name: ["first name", "firstname", "given name", "vorname", "voornaam", "forename"],
  last_name: ["last name", "lastname", "surname", "family name", "nachname", "familienname", "achternaam"],
  full_name: ["name", "full name", "fullname", "patient name", "patientenname", "volledige naam", "naam"],
  email: ["email", "e mail", "mail", "email address", "e mail address", "emailadres", "e mailadres"],
  phone: ["phone", "phone number", "telephone", "tel", "telefon", "telefoon", "mobile", "mobil", "handy", "telnr"],
  birth_date: ["birth date", "date of birth", "birthdate", "dob", "geburtsdatum", "geboortedatum", "birthday"],
  last_visit_date: [
    "last visit",
    "last visit date",
    "last seen",
    "last appointment",
    "letzter besuch",
    "letzter besuch am",
    "laatste bezoek",
    "laatste afspraak",
    "most recent visit",
  ],
  next_recall_date: [
    "next recall",
    "next recall date",
    "recall date",
    "next due",
    "due date",
    "recall due",
    "naechste kontrolle",
    "nächste kontrolle",
    "naechster termin",
    "volgende controle",
    "volgende afspraak",
  ],
  recall_interval_months: [
    "recall interval",
    "recall interval months",
    "interval months",
    "recall months",
    "recall intervall",
    "intervall",
    "interval",
  ],
  treatment_type: [
    "treatment",
    "treatment type",
    "treatmenttype",
    "procedure",
    "service",
    "recall type",
    "appointment type",
    "leistung",
    "behandlung",
    "behandlungsart",
    "behandeling",
    "behandelingstype",
  ],
  location: ["location", "practice", "clinic", "site", "standort", "locatie", "filiale", "branch"],
  provider: [
    "provider",
    "dentist",
    "doctor",
    "clinician",
    "dentist name",
    "behandler",
    "behandelnder arzt",
    "behandelaar",
    "tandarts",
  ],
  production_value: [
    "production",
    "production value",
    "value",
    "revenue",
    "amount",
    "price",
    "fee",
    "umsatz",
    "betrag",
    "omzet",
    "bedrag",
  ],
  consent_email: [
    "email consent",
    "consent email",
    "e mail consent",
    "email einwilligung",
    "e mail einwilligung",
    "email opt in",
    "toestemming email",
    "e mail toestemming",
  ],
  consent_sms: ["sms consent", "consent sms", "sms einwilligung", "sms opt in", "toestemming sms"],
  locale: ["locale", "language", "sprache", "taal", "preferred language", "voorkeurstaal"],
};

function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const normalizedAliases = new Map<CanonicalField, string[]>(
  Object.entries(aliases).map(([field, values]) => [
    field as CanonicalField,
    (values ?? []).map(normalizeHeader),
  ])
);

export function suggestMapping(headers: string[]): ImportMapping {
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeHeader(header) }));
  const used = new Set<string>();
  const mapping: ImportMapping = {};

  const scored: Array<{ field: CanonicalField; column: string; score: number }> = [];

  for (const [field, aliasList] of normalizedAliases) {
    for (const { header, normalized } of normalizedHeaders) {
      if (used.has(header)) continue;
      let bestScore = 0;
      for (const alias of aliasList) {
        if (normalized === alias) {
          bestScore = Math.max(bestScore, 100);
        } else if (normalized.length >= 3 && (normalized.includes(alias) || alias.includes(normalized))) {
          bestScore = Math.max(bestScore, 50);
        }
      }
      if (bestScore > 0) {
        scored.push({ field, column: header, score: bestScore });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  for (const item of scored) {
    if (mapping[item.field] || used.has(item.column)) continue;
    mapping[item.field] = item.column;
    used.add(item.column);
  }

  return mapping;
}

export function validateMapping(mapping: ImportMapping, headers: string[]): string[] {
  const errors: string[] = [];
  const headerSet = new Set(headers);

  for (const [field, column] of Object.entries(mapping)) {
    if (column && !headerSet.has(column)) {
      errors.push(`Column "${column}" for ${field} does not exist in this file.`);
    }
  }

  const identityFields: CanonicalField[] = ["external_id", "full_name", "first_name", "last_name"];
  if (!identityFields.some((field) => Boolean(mapping[field]))) {
    errors.push("Map at least one identity column: patient ID or name.");
  }

  if (!mapping.last_visit_date && !mapping.next_recall_date) {
    errors.push("Map at least one date column: last visit or next recall due.");
  }

  return errors;
}

export function mappedValue(
  row: Record<string, string>,
  mapping: ImportMapping,
  field: CanonicalField
): string {
  const column = mapping[field];
  if (!column) return "";
  return row[column]?.trim() ?? "";
}

export function mappingColumnCount(mapping: ImportMapping): number {
  return new Set(Object.values(mapping).filter(Boolean)).size;
}
