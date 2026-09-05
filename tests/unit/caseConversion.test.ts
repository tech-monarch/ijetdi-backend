import { describe, expect, it } from "vitest";
import { camelToSnake, snakeToCamel } from "../../src/lib/caseConversion.js";

describe("case conversion", () => {
  it("converts snake_case request bodies to camelCase", () => {
    expect(snakeToCamel({ publication_id: "abc", short_name: "IJETDI" })).toEqual({
      publicationId: "abc",
      shortName: "IJETDI",
    });
  });

  it("converts camelCase response data to snake_case", () => {
    expect(camelToSnake({ publicationId: "abc", shortName: "IJETDI" })).toEqual({
      publication_id: "abc",
      short_name: "IJETDI",
    });
  });

  it("recurses into arrays and nested objects", () => {
    expect(camelToSnake([{ articleType: "research" }])).toEqual([{ article_type: "research" }]);
  });

  it("leaves Date instances untouched", () => {
    const date = new Date("2026-01-01");
    const result = camelToSnake({ publishedDate: date }) as { published_date: Date };
    expect(result.published_date).toBe(date);
  });
});
