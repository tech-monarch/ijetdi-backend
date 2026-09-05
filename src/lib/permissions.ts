// Server-side mirror of the frontend's src/auth/permissions.js.
// This is the real security boundary — see docs/PERMISSIONS.md: every
// permission the frontend checks client-side must be independently
// re-checked here on every request. Keep this file in sync with the
// frontend's PERMISSIONS/ROLE_PERMISSIONS if either changes; there is no
// automated check that they agree (same manual-contract caveat the
// frontend doc itself calls out), so a deliberate diff review is the
// process for changing either one.
//
// Per docs/DATABASE_SCHEMA.md's recommendation, this stays as
// application code, not database rows — no runtime-editable-roles UI
// exists anywhere in the frontend to justify the extra complexity.

export const PERMISSIONS = [
  "publications.read",
  "publications.create",
  "publications.update",
  "publications.delete",
  "articles.read",
  "articles.create",
  "articles.update",
  "articles.publish",
  "authors.manage",
  "publishers.manage",
  "volumes.manage",
  "issues.manage",
  "editors.manage",
  "reviewers.manage",
  "reviews.manage",
  "reviews.read",
  "indexing.manage",
  "contacts.read",
  "contacts.manage",
  "seo.read",
  "seo.manage",
  "users.manage",
  "roles.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type Role =
  | "super_admin"
  | "admin"
  | "editorial_subadmin"
  | "publication_subadmin"
  | "seo_subadmin"
  | "support_subadmin"
  | "reviewer";

const ALL_EXCEPT_USER_MANAGEMENT: Permission[] = PERMISSIONS.filter(
  (p) => p !== "users.manage" && p !== "roles.manage",
);

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [...PERMISSIONS],
  admin: ALL_EXCEPT_USER_MANAGEMENT,
  editorial_subadmin: [
    "articles.read",
    "articles.create",
    "articles.update",
    "articles.publish",
    "authors.manage",
    "editors.manage",
    "reviewers.manage",
    "reviews.read",
    "reviews.manage",
  ],
  publication_subadmin: [
    "publications.read",
    "publications.create",
    "publications.update",
    "publications.delete",
    "volumes.manage",
    "issues.manage",
    "articles.read",
    "articles.update",
  ],
  seo_subadmin: ["seo.read", "seo.manage"],
  support_subadmin: ["contacts.read", "contacts.manage"],
  reviewer: ["reviews.read"],
};

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
