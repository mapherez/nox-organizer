import { mkdirSync } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function databaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/nox.db";
  const match = url.match(/^file:(.+)$/);
  if (match) {
    const file = decodeURIComponent(match[1]);
    // better-sqlite3 creates the file but not parent directories.
    if (!path.isAbsolute(file)) {
      try {
        mkdirSync(path.dirname(file), { recursive: true });
      } catch {
        // ignore — the driver will surface a real error if the path is unusable
      }
    }
  }
  return url;
}

/**
 * Prisma client singleton backed by SQLite (better-sqlite3 adapter).
 *
 * `connection()` ensures the database URL is read at request time rather
 * than inlined at build time.
 */
export async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  await connection();
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl() });
  const prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
  return prisma;
}
