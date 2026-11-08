import { describe, expect, it } from "vitest";
import { sanitizeMapping } from "./mapping";

describe("sanitizeMapping", () => {
  it("keeps only canonical fields with non-empty string columns", () => {
    expect(
      sanitizeMapping({
        first_name: "Vorname",
        last_visit_date: "Letzter Besuch",
        evil_field: "Drop",
        email: "",
        phone: 123,
        __proto__: "ignored",
      })
    ).toEqual({ first_name: "Vorname", last_visit_date: "Letzter Besuch" });
  });

  it("returns an empty mapping for invalid payloads", () => {
    expect(sanitizeMapping(null)).toEqual({});
    expect(sanitizeMapping("nope")).toEqual({});
    expect(sanitizeMapping({})).toEqual({});
  });
});
