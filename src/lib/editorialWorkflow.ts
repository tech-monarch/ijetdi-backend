// Implements docs/EDITORIAL_WORKFLOW.md §3's 11-transition table exactly.
// The frontend's quick-action buttons allow all 11 with zero server-side
// validation today — that's explicitly documented as a known gap, not
// something to replicate. This is the real enforcement.

export const ARTICLE_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "revision_required",
  "resubmitted",
  "accepted",
  "rejected",
  "scheduled",
  "published",
  "archived",
] as const;

export type ArticleStatusValue = (typeof ARTICLE_STATUSES)[number];

// from -> allowed set of "to" statuses.
const ALLOWED_TRANSITIONS: Record<ArticleStatusValue, ArticleStatusValue[]> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["revision_required", "accepted", "rejected"],
  revision_required: ["resubmitted"],
  resubmitted: ["under_review"],
  accepted: ["scheduled"],
  rejected: [], // terminal
  scheduled: ["published"],
  published: ["draft", "archived"], // unpublish, archive
  archived: [], // terminal (per current UI shortcuts)
};

export function isValidTransition(from: ArticleStatusValue, to: ArticleStatusValue): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isKnownArticleStatus(value: string): value is ArticleStatusValue {
  return (ARTICLE_STATUSES as readonly string[]).includes(value);
}
