import { describe, expect, it } from "vitest";
import { optionalEmail, optionalUrl } from "../../src/lib/zodHelpers.js";

// Regression test for a real bug: every admin *Form.jsx leaves an
// unfilled optional URL/email field as "" rather than omitting it, and
// plain z.string().url()/.email().optional() rejects "" as an invalid
// value (only `undefined` is tolerated by .optional()) — turning every
// blank optional field into a 400 Bad Request. See src/lib/zodHelpers.ts.

describe("optionalUrl", () => {
  const schema = optionalUrl();

  it("accepts a valid URL", () => {
    expect(schema.parse("https://example.com/logo.png")).toBe("https://example.com/logo.png");
  });

  it("treats an empty string as not provided", () => {
    expect(schema.parse("")).toBeUndefined();
  });

  it("accepts the field being entirely absent", () => {
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("still rejects a genuinely invalid, non-empty URL", () => {
    expect(() => schema.parse("not a url")).toThrow();
  });
});

describe("optionalEmail", () => {
  const schema = optionalEmail();

  it("accepts a valid email", () => {
    expect(schema.parse("editor@example.com")).toBe("editor@example.com");
  });

  it("treats an empty string as not provided", () => {
    expect(schema.parse("")).toBeUndefined();
  });

  it("still rejects a genuinely invalid, non-empty email", () => {
    expect(() => schema.parse("not an email")).toThrow();
  });
});
