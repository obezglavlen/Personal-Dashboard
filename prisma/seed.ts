import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@localhost.dev" },
    update: {},
    create: {
      email: "admin@localhost.dev",
      name: "Admin",
      password: hashedPassword,
    },
  });

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  await prisma.bookmark.createMany({
    data: [
      {
        userId: user.id,
        url: "https://github.com",
        title: "GitHub",
        category: "dev",
      },
      {
        userId: user.id,
        url: "https://news.ycombinator.com",
        title: "Hacker News",
        category: "news",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.note.createMany({
    data: [
      {
        userId: user.id,
        title: "Welcome",
        content: "This is your first note. Edit or delete it.",
        tags: ["welcome"],
        pinned: true,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.task.createMany({
    data: [
      { userId: user.id, title: "Set up dashboard", status: "done" },
      { userId: user.id, title: "Explore features", status: "todo" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete. Login: admin@localhost.dev / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
