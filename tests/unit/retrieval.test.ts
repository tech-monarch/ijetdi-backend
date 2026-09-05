import { describe, expect, it } from "vitest";
import { isInternallySufficient, MIN_SUFFICIENT_CHUNKS, SIMILARITY_THRESHOLD } from "../../src/modules/research-assistant/retrieval.pure.js";

describe("research-assistant: isInternallySufficient", () => {
  it("is false with no chunks", () => {
    expect(isInternallySufficient([])).toBe(false);
  });

  it("is false with only one strong match", () => {
    expect(isInternallySufficient([{ similarity: 0.9 }])).toBe(false);
  });

  it("is true with two matches at or above the threshold", () => {
    expect(isInternallySufficient([{ similarity: SIMILARITY_THRESHOLD }, { similarity: 0.99 }])).toBe(true);
  });

  it("does not count weak matches below the threshold toward the minimum", () => {
    const chunks = [{ similarity: 0.9 }, { similarity: 0.5 }, { similarity: 0.4 }];
    expect(isInternallySufficient(chunks)).toBe(false);
  });

  it("is true once enough strong matches accumulate among weaker ones", () => {
    const chunks = Array.from({ length: MIN_SUFFICIENT_CHUNKS }, () => ({ similarity: 0.95 })).concat([
      { similarity: 0.1 },
    ]);
    expect(isInternallySufficient(chunks)).toBe(true);
  });
});
