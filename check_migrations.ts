import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(
  "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at"
);
console.log(rows);
await prisma.$disconnect();
