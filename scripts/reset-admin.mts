import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const email = process.env.ADMIN_EMAIL ?? "admin@localhost.dev";
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error("ADMIN_PASSWORD env var required");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashed = await bcrypt.hash(password!, 12);
  const user = await prisma.user.update({
    where: { email },
    data: { password: hashed },
    select: { id: true, email: true },
  });
  console.log(`Password reset for ${user.email} (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
