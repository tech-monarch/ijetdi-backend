import { describe, expect, it } from "vitest";
import { slugify } from "../../src/lib/slugify.js";

describe("slugify", () => {
  it("produces a kebab-case slug from a title", () => {
    const slug = slugify("A Novel Approach to Embedded AI");
    expect(slug).toMatch(/^a-novel-approach-to-embedded-ai-[0-9a-f]{6}$/);
  });

  it("strips accents and non-alphanumeric characters", () => {
    const slug = slugify("Résumé: Über 100% Café!");
    expect(slug).toMatch(/^resume-uber-100-cafe-[0-9a-f]{6}$/);
  });

  it("produces different slugs for the same input (random suffix)", () => {
    const a = slugify("Same Title");
    const b = slugify("Same Title");
    expect(a).not.toBe(b);
  });

  it("falls back to a safe default for an empty/unusable title", () => {
    const slug = slugify("!!!");
    expect(slug).toMatch(/^submission-[0-9a-f]{6}$/);
  });

  it("truncates a very long title before appending the suffix", () => {
    const slug = slugify("a".repeat(200));
    // 80-char base + "-" + 6-char suffix
    expect(slug.length).toBe(80 + 1 + 6);
  });
});
