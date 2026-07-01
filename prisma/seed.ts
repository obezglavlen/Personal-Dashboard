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
    update: { password: hashedPassword },
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

  await prisma.subscription.createMany({
    data: [
      { userId: user.id, name: "Netflix",  price: 15.99, period: "monthly", tags: ["entertainment"] },
      { userId: user.id, name: "Spotify",  price: 9.99,  period: "monthly", tags: ["entertainment"] },
      { userId: user.id, name: "iCloud+",  price: 2.99,  period: "monthly", tags: ["storage"]       },
      { userId: user.id, name: "GitHub Pro", price: 48,   period: "annual",  tags: ["dev"]           },
    ],
    skipDuplicates: true,
  });

  await prisma.taxConfig.createMany({
    data: [
      { userId: user.id, name: "VAT",        rate: 20, staticAmount: 1000, currency: "USD" },
      { userId: user.id, name: "Income Tax", rate: 13, staticAmount: 500,  currency: "EUR" },
    ],
    skipDuplicates: true,
  });

  // Seed the shared tag catalog from the tags used above (seed inserts bypass
  // the API's automatic tag-sync).
  const seededTags = ["welcome", "entertainment", "storage", "dev"];
  await prisma.tag.createMany({
    data: seededTags.map((name) => ({ userId: user.id, name })),
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
