import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(
  "SELECT indexname, tablename FROM pg_indexes WHERE indexname IN ('article_chunks_embedding_idx', 'articles_search_vector_idx')"
);
console.log(rows);
await prisma.$disconnect();
