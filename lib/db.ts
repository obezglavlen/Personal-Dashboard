import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Cap the connection pool. Prisma Postgres (db.prisma.io) enforces a low
  // direct-connection limit, and the dashboard fans out a burst of concurrent
  // queries — ~10 in the server render plus one per client widget's SWR call —
  // which, uncapped, exceeds that limit and surfaces as "Failed to connect to
  // upstream database". A small max makes excess queries queue for a free
  // connection instead of failing; short timeouts release connections quickly
  // between serverless invocations and fail fast if the upstream is unreachable.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
