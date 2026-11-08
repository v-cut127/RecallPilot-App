import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("creates URL-safe practice slugs with a random suffix", () => {
    const slug = slugify("Müller & Zahnärzte Köln");
    expect(slug).toMatch(/^mueller-zahnaerzte-koeln-[a-z0-9]{6}$/);
  });

  it("falls back for names with no usable characters", () => {
    expect(slugify("!!!")).toMatch(/^practice-[a-z0-9]{6}$/);
  });
});
