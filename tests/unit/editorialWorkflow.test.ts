import { describe, expect, it } from "vitest";
import { isValidTransition } from "../../src/lib/editorialWorkflow.js";

describe("editorial workflow transitions", () => {
  it.each([
    ["draft", "submitted"],
    ["submitted", "under_review"],
    ["under_review", "revision_required"],
    ["under_review", "accepted"],
    ["under_review", "rejected"],
    ["revision_required", "resubmitted"],
    ["resubmitted", "under_review"],
    ["accepted", "scheduled"],
    ["scheduled", "published"],
    ["published", "draft"],
    ["published", "archived"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  it.each([
    ["draft", "published"],
    ["draft", "under_review"],
    ["rejected", "under_review"],
    ["archived", "published"],
    ["scheduled", "draft"],
    ["under_review", "published"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });
});
