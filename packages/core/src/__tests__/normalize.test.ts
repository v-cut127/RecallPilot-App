import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  normalizePhone,
  normalizeTreatment,
  parseConsent,
  parseDate,
  parseDecimal,
  validateRows,
} from "../normalize";
import { parseCsv } from "../csv";

describe("date parsing", () => {
  it("parses ISO dates", () => {
    expect(parseDate("2026-11-08")).toBe("2026-11-08");
    expect(parseDate("2026-11-08T12:30:00Z")).toBe("2026-11-08");
    expect(parseDate("2026/11/08")).toBe("2026-11-08");
  });

  it("parses European DD.MM.YYYY and DD/MM/YYYY dates", () => {
    expect(parseDate("08.11.2026")).toBe("2026-11-08");
    expect(parseDate("8.11.2026")).toBe("2026-11-08");
    expect(parseDate("08/11/2026")).toBe("2026-11-08");
    expect(parseDate("08-11-2026")).toBe("2026-11-08");
  });

  it("swaps clearly American month/day values", () => {
    expect(parseDate("13/01/2026")).toBe("2026-01-13");
    expect(parseDate("01/13/2026")).toBe("2026-01-13");
  });

  it("rejects impossible dates", () => {
    expect(parseDate("31.02.2024")).toBeNull();
    expect(parseDate("2024-13-01")).toBeNull();
    expect(parseDate("not-a-date")).toBeNull();
  });

  it("distinguishes empty values", () => {
    expect(parseDate("")).toBeUndefined();
    expect(parseDate(null)).toBeUndefined();
  });

  it("parses Excel serial dates", () => {
    expect(parseDate("45658")).toBe("2025-01-01");
  });
});

describe("value normalization", () => {
  it("parses European and US decimal values", () => {
    expect(parseDecimal("1.234,56")).toBe(1234.56);
    expect(parseDecimal("1,234.56")).toBe(1234.56);
    expect(parseDecimal("120,00")).toBe(120);
    expect(parseDecimal("€ 90")).toBe(90);
    expect(parseDecimal("-50")).toBe(-50);
    expect(parseDecimal("abc")).toBeNull();
  });

  it("normalizes emails and phones", () => {
    expect(normalizeEmail("  Anna@Example.TEST ")).toBe("anna@example.test");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("")).toBeUndefined();
    expect(normalizePhone("+49 (30) 123-4567")).toBe("+49301234567");
    expect(normalizePhone("0049 30 1234567")).toBe("+49301234567");
    expect(normalizePhone("123")).toBeNull();
  });

  it("parses consent only when explicit", () => {
    expect(parseConsent("Yes")).toEqual({ granted: true, known: true });
    expect(parseConsent("Ja")).toEqual({ granted: true, known: true });
    expect(parseConsent("no")).toEqual({ granted: false, known: true });
    expect(parseConsent("maybe")).toEqual({ granted: false, known: false });
    expect(parseConsent("")).toEqual({ granted: false, known: false });
  });

  it("normalizes treatment aliases", () => {
    expect(normalizeTreatment("Prophylaxis")).toBe("hygiene");
    expect(normalizeTreatment("Mundhygiene")).toBe("hygiene");
    expect(normalizeTreatment("Kontrolle")).toBe("checkup");
    expect(normalizeTreatment("Check-up")).toBe("checkup");
    expect(normalizeTreatment("Wurzelbehandlung")).toBe("treatment");
    expect(normalizeTreatment("something else")).toBe("other");
  });
});

describe("row validation", () => {
  const mapping = {
    external_id: "Patient ID",
    first_name: "First Name",
    last_name: "Last Name",
    email: "Email",
    last_visit_date: "Last Visit",
    location: "Location",
    consent_email: "Email Consent",
  };

  function validate(csv: string, existingKeys?: Set<string>) {
    const parsed = parseCsv(csv, ",");
    return {
      parsed,
      summary: validateRows({
        parsed,
        mapping,
        options: { scope: "org", knownLocations: ["Central Clinic"], asOfDate: "2026-11-08" },
        existingKeys,
        today: "2026-11-08",
      }),
    };
  }

  it("normalizes a valid row and warns about missing consent only when explicit columns are absent", () => {
    const { summary } = validate(
      `Patient ID,First Name,Last Name,Email,Last Visit,Location,Email Consent\nP1,Anna,Weber,anna@example.test,08.11.2025,Central Clinic,Yes\n`
    );
    expect(summary.validRows).toBe(1);
    expect(summary.rows[0]?.normalized.email).toBe("anna@example.test");
    expect(summary.rows[0]?.normalized.consentEmail).toBe(true);
    expect(summary.rows[0]?.issues).toEqual([]);
  });

  it("rejects duplicate patient keys inside the file", () => {
    const { summary } = validate(
      `Patient ID,First Name,Last Name,Email,Last Visit,Location,Email Consent\nP1,Anna,Weber,a@example.test,08.11.2025,Central Clinic,Yes\nP1,Anna,Weber,a@example.test,08.11.2025,Central Clinic,Yes\n`
    );
    expect(summary.validRows).toBe(1);
    expect(summary.errorRows).toBe(1);
    expect(summary.rows[1]?.issues.some((issue) => issue.code === "duplicate_in_file")).toBe(true);
  });

  it("warns when the patient already exists but still allows upsert", () => {
    const { summary } = validate(
      `Patient ID,First Name,Last Name,Email,Last Visit,Location,Email Consent\nP1,Anna,Weber,a@example.test,08.11.2025,Central Clinic,Yes\n`,
      new Set(["ext:p1"])
    );
    expect(summary.validRows).toBe(1);
    expect(summary.rows[0]?.issues.some((issue) => issue.code === "duplicate_existing")).toBe(true);
  });

  it("rejects invalid dates, unknown locations and missing names", () => {
    const { summary } = validate(
      `Patient ID,First Name,Last Name,Email,Last Visit,Location,Email Consent\nP1,,,a@example.test,31.02.2024,Atlantis Clinic,Yes\n`
    );
    const codes = summary.rows[0]?.issues.map((issue) => issue.code);
    expect(codes).toContain("missing_name");
    expect(codes).toContain("invalid_date");
    expect(codes).toContain("unknown_location");
    expect(summary.errorRows).toBe(1);
  });

  it("normalizes full names when a single name column is mapped", () => {
    const parsed = parseCsv(
      `Patienten-ID;Name;Letzter Besuch\nP1;Anna Weber;01.02.2025\n`,
      ";"
    );
    const summary = validateRows({
      parsed,
      mapping: { external_id: "Patienten-ID", full_name: "Name", last_visit_date: "Letzter Besuch" },
      options: { scope: "lead", asOfDate: "2026-11-08" },
      today: "2026-11-08",
    });
    expect(summary.rows[0]?.normalized.firstName).toBe("Anna");
    expect(summary.rows[0]?.normalized.lastName).toBe("Weber");
  });
});
