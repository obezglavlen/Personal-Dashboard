import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { requiredAdminPassword } from "../lib/seed-admin";

const email = process.env.ADMIN_EMAIL ?? "admin@localhost.dev";
const password = requiredAdminPassword(process.env);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashed = await bcrypt.hash(password, 12);
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
