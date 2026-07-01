import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection-pool size. Prisma Postgres (db.prisma.io) enforces a low
// direct-connection limit, and the dashboard fans out a burst of concurrent
// queries — ~10 in the server render plus one per client widget's SWR call —
// which, uncapped, exceeds that limit and surfaces as "Failed to connect to
// upstream database". Default to a small cap so excess queries queue for a
// free connection instead of failing. Raise it via DATABASE_POOL_MAX when
// moving to a bigger database (e.g. `10` to match pg's old default, or higher).
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX) || 3;

function createPrismaClient() {
  // Short timeouts release connections quickly between serverless invocations
  // and fail fast if the upstream is unreachable rather than hanging.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: POOL_MAX,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
