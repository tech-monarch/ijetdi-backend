import { describe, expect, it } from "vitest";
import { roleHasPermission } from "../../src/lib/permissions.js";

describe("role permissions", () => {
  it("super_admin has every permission", () => {
    expect(roleHasPermission("super_admin", "users.manage")).toBe(true);
    expect(roleHasPermission("super_admin", "contacts.manage")).toBe(true);
  });

  it("admin has everything except user/role management", () => {
    expect(roleHasPermission("admin", "articles.publish")).toBe(true);
    expect(roleHasPermission("admin", "users.manage")).toBe(false);
    expect(roleHasPermission("admin", "roles.manage")).toBe(false);
  });

  it("reviewer can only read reviews", () => {
    expect(roleHasPermission("reviewer", "reviews.read")).toBe(true);
    expect(roleHasPermission("reviewer", "reviews.manage")).toBe(false);
    expect(roleHasPermission("reviewer", "articles.read")).toBe(false);
  });

  it("publication_subadmin cannot publish articles", () => {
    expect(roleHasPermission("publication_subadmin", "articles.update")).toBe(true);
    expect(roleHasPermission("publication_subadmin", "articles.publish")).toBe(false);
  });

  it("editorial_subadmin cannot manage publications", () => {
    expect(roleHasPermission("editorial_subadmin", "articles.publish")).toBe(true);
    expect(roleHasPermission("editorial_subadmin", "publications.update")).toBe(false);
  });
});
