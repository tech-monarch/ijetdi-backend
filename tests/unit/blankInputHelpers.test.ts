import { describe, expect, it } from "vitest";
import { optionalDate, optionalId, optionalInt } from "../../src/lib/zodHelpers.js";
import { omitAuthorEmail } from "../../src/lib/publicAuthor.js";
import { articleCreateSchema, articleUpdateSchema } from "../../src/modules/articles/articles.schemas.js";
import { issueCreateSchema } from "../../src/modules/issues/issues.schemas.js";
import { volumeCreateSchema } from "../../src/modules/volumes/volumes.schemas.js";

describe("blank-input helpers (regressions found by replaying the admin forms' real payloads)", () => {
  it("optionalDate: '' clears (null), a real date parses, undefined is left alone", () => {
    expect(optionalDate().parse("")).toBeNull();
    expect(optionalDate().parse(undefined)).toBeUndefined();
    expect(optionalDate().parse("2026-02-01")).toBeInstanceOf(Date);
    expect(() => optionalDate().parse("not-a-date")).toThrow();
  });
  it("optionalId: '' and null clear, a value passes", () => {
    expect(optionalId().parse("")).toBeNull();
    expect(optionalId().parse(null)).toBeNull();
    expect(optionalId().parse("abc")).toBe("abc");
  });
  it("optionalInt: null/'' clear instead of coercing to 0", () => {
    expect(optionalInt().parse(null)).toBeNull();
    expect(optionalInt().parse("")).toBeNull();
    expect(optionalInt().parse("2026")).toBe(2026);
  });
  it("ArticleForm's pristine payload validates", () => {
    const parsed = articleCreateSchema.parse({
      slug: "s", title: "t", abstract: "a", publicationId: "p", articleType: "Research Article", status: "draft",
      volumeId: "", issueId: "", receivedDate: "", revisedDate: "", acceptedDate: "", publishedDate: "", pdfUrl: "",
      keywords: [], seo: { title: "x" },
    });
    expect(parsed.volumeId).toBeNull();
    expect(parsed.receivedDate).toBeNull();
  });
  it("article PATCH: an omitted key stays omitted (not defaulted/cleared)", () => {
    const parsed = articleUpdateSchema.parse({ title: "x" });
    expect("volumeId" in parsed && parsed.volumeId !== undefined).toBe(false);
    expect(parsed.keywords).toBeUndefined();
  });
  it("IssueForm blank publicationDate and VolumeForm year:null validate", () => {
    expect(issueCreateSchema.parse({ volumeId: "v", publicationId: "p", number: 1, label: "L", publicationDate: "", status: "current" }).publicationDate).toBeNull();
    expect(volumeCreateSchema.parse({ publicationId: "p", number: 1, year: null, status: "active" }).year).toBeNull();
  });
});

describe("omitAuthorEmail", () => {
  it("drops email, keeps everything else", () => {
    expect(omitAuthorEmail({ id: "1", fullName: "A", email: "a@x.org" })).toEqual({ id: "1", fullName: "A" });
  });
});
