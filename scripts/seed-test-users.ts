// Creates one login per role directly in the database this script is run
// against (reads DATABASE_URL from .env, same as the rest of the app), with a
// known password, bypassing the invite-email flow entirely — useful for
// testing each role's screens without configuring Resend.
//
// Usage:  npx tsx scripts/seed-test-users.ts
//
// SECURITY: these are real accounts with a real, shared, publicly-known
// password. Do not leave them active on a production database. Either run
// `npx tsx scripts/seed-test-users.ts --remove` when done testing, or
// deactivate/delete them from the admin Users screen.
import argon2 from "argon2";
import { prisma } from "../src/config/db.js";

const PASSWORD = "TestRole-2026!";
const DOMAIN = "test.local"; // deliberately not a real, deliverable domain

const ROLES = [
  "super_admin",
  "admin",
  "editorial_subadmin",
  "publication_subadmin",
  "seo_subadmin",
  "support_subadmin",
] as const;

async function main() {
  const remove = process.argv.includes("--remove");

  if (remove) {
    const { count } = await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    const reviewers = await prisma.reviewer.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    console.log(`Removed ${count} test user(s) and ${reviewers.count} test reviewer(s).`);
    return;
  }

  const passwordHash = await argon2.hash(PASSWORD);
  console.log(`Seeding test users (password for all: ${PASSWORD})\n`);

  for (const role of ROLES) {
    const email = `${role}@${DOMAIN}`;
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role, active: true },
      create: { name: `Test ${role}`, email, role, passwordHash, active: true },
    });
    console.log(`  ${role.padEnd(22)} ${email}`);
  }

  // "reviewer" needs a linked Reviewer profile (self-service routes resolve
  // the reviewer purely from session.reviewerId — see reviewers-reviews.routes.ts).
  const reviewer = await prisma.reviewer.upsert({
    where: { email: `reviewer@${DOMAIN}` },
    update: { status: "active" },
    create: { name: "Test reviewer", email: `reviewer@${DOMAIN}`, status: "active", expertise: [] },
  });
  await prisma.user.upsert({
    where: { email: `reviewer@${DOMAIN}` },
    update: { passwordHash, role: "reviewer", reviewerId: reviewer.id, active: true },
    create: { name: "Test reviewer", email: `reviewer@${DOMAIN}`, role: "reviewer", reviewerId: reviewer.id, passwordHash, active: true },
  });
  console.log(`  ${"reviewer".padEnd(22)} reviewer@${DOMAIN}`);

  console.log(`\nDone. Remove them later with: npx tsx scripts/seed-test-users.ts --remove`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
