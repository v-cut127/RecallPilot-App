import { describe, expect, it } from "vitest";
import {
  buildCsv,
  detectDelimiter,
  detectEncoding,
  escapeCsvCell,
  inspectCsv,
  parseCsv,
  toRowObjects,
} from "../csv";

describe("encoding detection", () => {
  it("strips a UTF-8 BOM and reports it", () => {
    const buffer = Buffer.from(`\uFEFFname,email\nAnna,anna@example.test\n`, "utf8");
    const decoded = detectEncoding(buffer);
    expect(decoded.encoding).toBe("utf-8");
    expect(decoded.hasBom).toBe(true);
    expect(decoded.text.startsWith("name")).toBe(true);
  });

  it("falls back to windows-1252 for European bytes", () => {
    const buffer = Buffer.from("name,email\nMüller,m@example.test\n", "latin1");
    const decoded = detectEncoding(buffer);
    expect(decoded.encoding).toBe("windows-1252");
    expect(decoded.text).toContain("Müller");
  });
});

describe("delimiter detection", () => {
  it("detects comma", () => {
    expect(detectDelimiter("a,b,c\n1,2,3\n4,5,6")).toBe(",");
  });

  it("detects semicolon and ignores commas inside quoted fields", () => {
    expect(detectDelimiter('Name;Email;Note\n"Müller, Anna";a@b.com;"hello, world"\n')).toBe(";");
  });

  it("detects tab", () => {
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });
});

describe("csv parser", () => {
  it("handles quoted delimiters, escaped quotes and embedded newlines", () => {
    const text = `name,note\n"Doe, Jane","She said ""hello"""\n"Multi\nLine",plain\n`;
    const parsed = parseCsv(text, ",");
    expect(parsed.headers).toEqual(["name", "note"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]?.values).toEqual(["Doe, Jane", 'She said "hello"']);
    expect(parsed.rows[1]?.values).toEqual(["Multi\nLine", "plain"]);
  });

  it("deduplicates headers and records column count mismatches", () => {
    const parsed = parseCsv("Email,Email\none@example.test,two@example.test\nthree@example.test\n", ",");
    expect(parsed.headers).toEqual(["Email", "Email (2)"]);
    expect(parsed.rows[1]?.columnCountMismatch).toBe(true);
  });

  it("skips blank rows and maps rows to objects", () => {
    const parsed = parseCsv("name,email\n\nAnna,anna@example.test\n\n", ",");
    expect(parsed.rows).toHaveLength(1);
    expect(toRowObjects(parsed, parsed.rows[0]!)).toEqual({
      name: "Anna",
      email: "anna@example.test",
    });
  });

  it("inspects a semicolon/DD.MM.YYYY file with a BOM", () => {
    const buffer = Buffer.from(
      `\uFEFFVorname;Nachname;E-Mail;Letzter Besuch\nAnna;Weber;anna@example.test;01.02.2024\n`,
      "utf8"
    );
    const { detection, parsed } = inspectCsv(buffer);
    expect(detection.encoding).toBe("utf-8");
    expect(detection.hasBom).toBe(true);
    expect(detection.delimiter).toBe(";");
    expect(parsed.rows[0]?.values[3]).toBe("01.02.2024");
  });
});

describe("csv output", () => {
  it("protects against formula injection", () => {
    expect(escapeCsvCell("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(escapeCsvCell("+49 30 123")).toBe("'+49 30 123");
    expect(escapeCsvCell("@cmd")).toBe("'@cmd");
    expect(escapeCsvCell("normal")).toBe("normal");
  });

  it("quotes cells with delimiters, quotes and newlines", () => {
    expect(escapeCsvCell('Doe, Jane')).toBe('"Doe, Jane"');
    expect(escapeCsvCell('She said "hi"')).toBe('"She said ""hi"""');
    expect(escapeCsvCell("line\nbreak")).toBe('"line\nbreak"');
  });

  it("builds a CSV with a trailing newline", () => {
    const csv = buildCsv(["a", "b"], [[1, "two, three"]]);
    expect(csv).toBe('a,b\r\n1,"two, three"\r\n');
  });
});
