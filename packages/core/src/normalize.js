import { addMonths, format, isValid, parseISO } from "date-fns";
import { buildCsv } from "./csv";
import { mappedValue } from "./mapping";
import { toRowObjects } from "./csv";
function pad(value) {
    return String(value).padStart(2, "0");
}
function isoDate(year, month, day) {
    if (month < 1 || month > 12 || day < 1 || day > 31)
        return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day) {
        return null;
    }
    return `${year}-${pad(month)}-${pad(day)}`;
}
/**
 * Parses ISO dates and European DD.MM.YYYY / DD/MM/YYYY dates.
 * Returns undefined for an empty value and null for an invalid value.
 */
export function parseDate(value) {
    if (value === null || value === undefined)
        return undefined;
    const raw = value.trim();
    if (raw === "")
        return undefined;
    const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
    if (isoMatch) {
        return isoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    }
    const europeanMatch = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (europeanMatch) {
        let day = Number(europeanMatch[1]);
        let month = Number(europeanMatch[2]);
        const rawYear = Number(europeanMatch[3]);
        const year = rawYear < 100 ? 2000 + rawYear : rawYear;
        if (month > 12 && day <= 12) {
            const swap = day;
            day = month;
            month = swap;
        }
        return isoDate(year, month, day);
    }
    if (/^\d{5}$/.test(raw)) {
        const serial = Number(raw);
        if (serial >= 20_000 && serial <= 80_000) {
            const epoch = Date.UTC(1899, 11, 30);
            const date = new Date(epoch + serial * 86_400_000);
            return isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
        }
    }
    return null;
}
const TRUE_VALUES = new Set([
    "true",
    "yes",
    "y",
    "1",
    "ja",
    "j",
    "ja graag",
    "granted",
    "given",
    "consented",
    "opt in",
    "opted in",
    "toestemming",
    "einwilligung",
    "akkoord",
]);
const FALSE_VALUES = new Set([
    "false",
    "no",
    "n",
    "0",
    "nein",
    "nee",
    "declined",
    "denied",
    "revoked",
    "withdrawn",
    "opt out",
    "opted out",
    "keine",
    "geen",
]);
export function parseConsent(value) {
    if (value === null || value === undefined)
        return { granted: false, known: false };
    const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (normalized === "")
        return { granted: false, known: false };
    if (TRUE_VALUES.has(normalized))
        return { granted: true, known: true };
    if (FALSE_VALUES.has(normalized))
        return { granted: false, known: true };
    return { granted: false, known: false };
}
export function parseDecimal(value) {
    if (value === null || value === undefined)
        return undefined;
    const raw = value.trim();
    if (raw === "")
        return undefined;
    let normalized = raw.replace(/[^\d.,-]/g, "");
    if (normalized === "" || normalized === "-")
        return null;
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
    }
    else {
        normalized = normalized.replace(/,/g, "");
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}
export function normalizeEmail(value) {
    if (value === null || value === undefined)
        return undefined;
    const email = value.trim().toLowerCase();
    if (email === "")
        return undefined;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}
export function normalizePhone(value) {
    if (value === null || value === undefined)
        return undefined;
    const raw = value.trim();
    if (raw === "")
        return undefined;
    let normalized = raw.replace(/[^\d+]/g, "");
    if (normalized.startsWith("00"))
        normalized = `+${normalized.slice(2)}`;
    if (normalized.startsWith("+")) {
        normalized = `+${normalized.slice(1).replace(/\+/g, "")}`;
    }
    else {
        normalized = normalized.replace(/\+/g, "");
    }
    const digits = normalized.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15 ? normalized : null;
}
const TREATMENT_ALIASES = [
    {
        type: "hygiene",
        aliases: [
            "hygiene",
            "prophylaxis",
            "prophy",
            "clean",
            "cleaning",
            "dental cleaning",
            "recall",
            "pzr",
            "mundhygiene",
            "profylaxe",
            "gebitsreiniging",
            "controle",
        ],
    },
    {
        type: "checkup",
        aliases: [
            "checkup",
            "check up",
            "check",
            "exam",
            "examination",
            "periodic exam",
            "kontrolle",
            "untersuchung",
            "controle",
            "onderzoek",
        ],
    },
    {
        type: "treatment",
        aliases: [
            "treatment",
            "filling",
            "crown",
            "bridge",
            "root canal",
            "endodontic",
            "extraction",
            "implant",
            "scaling",
            "paro",
            "periodontal",
            "restoration",
            "behandlung",
            "fuellung",
            "krone",
            "wurzelbehandlung",
            "behandeling",
            "vulling",
            "kroon",
            "wortelkanaal",
        ],
    },
];
export function normalizeTreatment(value) {
    if (!value)
        return "other";
    const normalized = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    if (!normalized)
        return "other";
    for (const entry of TREATMENT_ALIASES) {
        if (entry.aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
            return entry.type;
        }
    }
    return "other";
}
export function normalizeLocale(value, fallback = "en") {
    if (!value)
        return fallback;
    const normalized = value.trim().toLowerCase();
    if (normalized.startsWith("de"))
        return "de";
    if (normalized.startsWith("nl"))
        return "nl";
    if (normalized.startsWith("en"))
        return "en";
    return fallback;
}
function cleanName(value) {
    const cleaned = value.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim().slice(0, 200);
    return cleaned === "" ? null : cleaned;
}
export function buildPatientKey(input) {
    if (input.externalId)
        return `ext:${input.externalId.trim().toLowerCase()}`;
    const name = `${(input.firstName ?? "").toLowerCase()}|${(input.lastName ?? "").toLowerCase()}`;
    return `syn:${name}|${input.birthDate ?? ""}|${input.email ?? input.phone ?? ""}`;
}
function validateDateField(raw, field, issues) {
    const parsed = parseDate(raw);
    if (parsed === undefined)
        return null;
    if (parsed === null) {
        issues.push({
            field,
            code: "invalid_date",
            message: `"${raw}" is not a valid date. Use YYYY-MM-DD or DD.MM.YYYY.`,
            severity: "error",
        });
        return null;
    }
    return parsed;
}
export function normalizeRow(input) {
    const { rowNumber, row, mapping, options } = input;
    const issues = [];
    const asOfDate = input.today ?? options.asOfDate ?? format(new Date(), "yyyy-MM-dd");
    let firstName = cleanName(mappedValue(row, mapping, "first_name"));
    let lastName = cleanName(mappedValue(row, mapping, "last_name"));
    const fullName = cleanName(mappedValue(row, mapping, "full_name"));
    if ((!firstName || !lastName) && fullName) {
        const parts = fullName.split(" ");
        if (!firstName)
            firstName = parts[0] ?? null;
        if (!lastName)
            lastName = parts.slice(1).join(" ") || null;
    }
    if (!firstName && !lastName) {
        issues.push({
            field: "full_name",
            code: "missing_name",
            message: "The row has no patient name.",
            severity: "error",
        });
    }
    const rawEmail = mappedValue(row, mapping, "email");
    const email = normalizeEmail(rawEmail);
    if (email === null) {
        issues.push({
            field: "email",
            code: "invalid_email",
            message: `"${rawEmail}" is not a valid email address.`,
            severity: "error",
        });
    }
    const rawPhone = mappedValue(row, mapping, "phone");
    const phone = normalizePhone(rawPhone);
    if (phone === null) {
        issues.push({
            field: "phone",
            code: "invalid_phone",
            message: `"${rawPhone}" is not a valid phone number.`,
            severity: "error",
        });
    }
    if (!email && !phone) {
        issues.push({
            field: "email",
            code: "missing_contact",
            message: "The row has no usable email or phone number.",
            severity: "warning",
        });
    }
    const lastVisitRaw = mappedValue(row, mapping, "last_visit_date");
    const nextRecallRaw = mappedValue(row, mapping, "next_recall_date");
    const lastVisitAt = validateDateField(lastVisitRaw, "last_visit_date", issues);
    const nextRecallAt = validateDateField(nextRecallRaw, "next_recall_date", issues);
    if (!lastVisitAt && !nextRecallAt && !issues.some((issue) => issue.code === "invalid_date")) {
        issues.push({
            field: "last_visit_date",
            code: "missing_date",
            message: "The row has no last visit or next recall date.",
            severity: "error",
        });
    }
    if (lastVisitAt && lastVisitAt > asOfDate) {
        issues.push({
            field: "last_visit_date",
            code: "future_date",
            message: "The last visit date is in the future.",
            severity: "error",
        });
    }
    const rawBirthDate = mappedValue(row, mapping, "birth_date");
    const birthDate = validateDateField(rawBirthDate, "birth_date", issues);
    if (birthDate && birthDate > asOfDate) {
        issues.push({
            field: "birth_date",
            code: "invalid_birth_date",
            message: "The date of birth is in the future.",
            severity: "error",
        });
    }
    const rawInterval = mappedValue(row, mapping, "recall_interval_months");
    let recallIntervalMonths = null;
    if (rawInterval) {
        const parsed = Number.parseInt(rawInterval.replace(/[^\d]/g, ""), 10);
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 60) {
            recallIntervalMonths = parsed;
        }
        else {
            issues.push({
                field: "recall_interval_months",
                code: "invalid_interval",
                message: `"${rawInterval}" is not a recall interval between 1 and 60 months.`,
                severity: "warning",
            });
        }
    }
    const rawProduction = mappedValue(row, mapping, "production_value");
    const productionValue = parseDecimal(rawProduction);
    if (productionValue === null || (productionValue !== undefined && productionValue < 0)) {
        issues.push({
            field: "production_value",
            code: "invalid_number",
            message: `"${rawProduction}" is not a valid production value.`,
            severity: "warning",
        });
    }
    const treatmentRaw = mappedValue(row, mapping, "treatment_type");
    const treatmentType = normalizeTreatment(treatmentRaw);
    const locationName = cleanName(mappedValue(row, mapping, "location"));
    const providerName = cleanName(mappedValue(row, mapping, "provider"));
    if (options.scope === "org" && locationName && options.knownLocations) {
        const known = new Set(options.knownLocations.map((name) => name.toLowerCase()));
        if (!known.has(locationName.toLowerCase())) {
            issues.push({
                field: "location",
                code: "unknown_location",
                message: `Location "${locationName}" is not configured yet. It will be created when the import is committed.`,
                severity: "warning",
            });
        }
    }
    if (options.scope === "org" && providerName && options.knownProviders) {
        const known = new Set(options.knownProviders.map((name) => name.toLowerCase()));
        if (!known.has(providerName.toLowerCase())) {
            issues.push({
                field: "provider",
                code: "unknown_provider",
                message: `Provider "${providerName}" is not configured yet. It will be created when the import is committed.`,
                severity: "warning",
            });
        }
    }
    const consentEmailRaw = mappedValue(row, mapping, "consent_email");
    const consentEmail = parseConsent(consentEmailRaw);
    const consentSmsRaw = mappedValue(row, mapping, "consent_sms");
    const consentSms = parseConsent(consentSmsRaw);
    if (!consentEmail.known) {
        issues.push({
            field: "consent_email",
            code: "missing_consent",
            message: "Email consent is missing or not explicit. Future email outreach will be blocked for this patient.",
            severity: "warning",
        });
    }
    const externalIdRaw = mappedValue(row, mapping, "external_id");
    const externalId = externalIdRaw ? externalIdRaw.trim().slice(0, 120) : null;
    const patientKey = buildPatientKey({
        externalId,
        firstName,
        lastName,
        birthDate,
        email: email ?? null,
        phone: phone ?? null,
    });
    const normalized = {
        rowNumber,
        externalId,
        patientKey,
        firstName,
        lastName,
        email: email ?? null,
        phone: phone ?? null,
        birthDate,
        lastVisitAt,
        nextRecallAt,
        recallIntervalMonths,
        treatmentType,
        treatmentRaw: treatmentRaw || null,
        locationName,
        providerName,
        productionValue: productionValue ?? null,
        consentEmail: consentEmail.granted,
        consentSms: consentSms.granted,
        locale: normalizeLocale(mappedValue(row, mapping, "locale"), options.defaultLocale ?? "en"),
        sourceRow: row,
    };
    return { rowNumber, normalized, issues };
}
export function validateRows(input) {
    const { parsed, mapping, options } = input;
    const rows = [];
    const seenKeys = new Map();
    let validRows = 0;
    let errorRows = 0;
    let warningRows = 0;
    let duplicateRows = 0;
    for (const parsedRow of parsed.rows) {
        const row = toRowObjects(parsed, parsedRow);
        const validated = normalizeRow({
            rowNumber: parsedRow.rowNumber,
            row,
            mapping,
            options,
            today: input.today,
        });
        if (parsedRow.columnCountMismatch) {
            validated.issues.push({
                field: "row",
                code: "column_count_mismatch",
                message: `The row has ${parsedRow.values.length} values but the file has ${parsed.headers.length} columns.`,
                severity: "warning",
            });
        }
        const seenAt = seenKeys.get(validated.normalized.patientKey);
        if (seenAt !== undefined) {
            validated.issues.push({
                field: "external_id",
                code: "duplicate_in_file",
                message: `Duplicate of row ${seenAt}. Only the first occurrence can be imported.`,
                severity: "error",
            });
            duplicateRows += 1;
        }
        else {
            seenKeys.set(validated.normalized.patientKey, parsedRow.rowNumber);
        }
        if (input.existingKeys?.has(validated.normalized.patientKey) && seenAt === undefined) {
            validated.issues.push({
                field: "external_id",
                code: "duplicate_existing",
                message: "A patient with this key already exists. The import will update that record.",
                severity: "warning",
            });
        }
        const hasError = validated.issues.some((issue) => issue.severity === "error");
        const hasWarning = validated.issues.some((issue) => issue.severity === "warning");
        if (hasError)
            errorRows += 1;
        else
            validRows += 1;
        if (hasWarning)
            warningRows += 1;
        rows.push(validated);
    }
    return {
        rows,
        totalRows: rows.length,
        validRows,
        errorRows,
        warningRows,
        duplicateRows,
    };
}
export function buildValidationErrorCsv(summary) {
    const rows = [];
    for (const row of summary.rows) {
        for (const issue of row.issues) {
            rows.push([
                row.rowNumber,
                issue.severity,
                issue.field,
                issue.code,
                issue.message,
                row.normalized.patientKey,
                JSON.stringify(row.normalized.sourceRow),
            ]);
        }
    }
    return buildCsv(["row_number", "severity", "field", "code", "message", "patient_key", "raw_row"], rows);
}
export function effectiveRecallDueDate(row, defaultIntervals) {
    if (row.nextRecallAt)
        return row.nextRecallAt;
    if (!row.lastVisitAt)
        return null;
    const interval = row.recallIntervalMonths ?? defaultIntervals[row.treatmentType];
    return format(addMonths(parseISO(row.lastVisitAt), interval), "yyyy-MM-dd");
}
export function isDateValid(value) {
    return isValid(parseISO(value));
}
//# sourceMappingURL=normalize.js.map