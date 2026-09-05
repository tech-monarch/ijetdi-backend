import argon2 from "argon2";
import { prisma } from "../config/db.js";

// BACKEND_HANDOFF.md is explicit: don't fabricate placeholder content
// (ISSNs, publisher/editor names, indexing partners, sample DOIs) — every
// one of those needs real content before launch, not more generated fake
// rows. So this seed script does exactly one thing: creates a single
// super_admin login, using values you provide via env vars, so the
// system is usable on first boot. Everything else (publishers,
// publications, articles, editors, ...) gets entered through the real
// admin UI once it exists, with real data.
//
// Usage: SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=... npm run seed

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    // eslint-disable-next-line no-console
    console.error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to seed an initial admin user. Skipping.");
    return;
  }

  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role: "super_admin" },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded super_admin user: ${user.email}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
