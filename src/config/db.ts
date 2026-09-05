import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

// Standard singleton pattern so `tsx watch`/hot-reload in dev doesn't
// exhaust the Postgres connection pool by re-instantiating on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
