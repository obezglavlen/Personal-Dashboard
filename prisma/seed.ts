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

  // Financial accounts — only when the demo user has none, so a real user's
  // accounts are never touched. Balances may be negative (liabilities). The USD
  // accounts net to 27,500 and EUR to 6,300, which the latest snapshot below
  // matches so the trend's newest point agrees with the summary cards.
  const accountCount = await prisma.financialAccount.count({
    where: { userId: user.id },
  });
  if (accountCount === 0) {
    await prisma.financialAccount.createMany({
      data: [
        { userId: user.id, name: "Main Checking", type: "checking",   balance: 8200,  currency: "USD" },
        { userId: user.id, name: "Savings",       type: "savings",    balance: 16500, currency: "USD" },
        { userId: user.id, name: "Credit Card",   type: "credit",     balance: -1400, currency: "USD" },
        { userId: user.id, name: "Brokerage",     type: "investment", balance: 4200,  currency: "USD" },
        { userId: user.id, name: "Euro Account",  type: "checking",   balance: 6300,  currency: "EUR" },
      ],
    });
  }

  // Historical net-worth snapshots so the trend chart and its range selector
  // (1M / 3M / 1Y / All) have real history to plot. Guarded on count === 0: the
  // daily cron owns this table in a running app, so re-seeding never overwrites
  // the snapshots it has already recorded. Values are deterministic (no RNG) so
  // a fresh DB always reproduces the same ~13-month history.
  const snapshotCount = await prisma.netWorthSnapshot.count({
    where: { userId: user.id },
  });
  if (snapshotCount === 0) {
    const DAYS = 400;
    const now = new Date();
    const todayUTC = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const snapshots = [];
    for (let i = DAYS; i >= 0; i--) {
      // date is @db.Date at UTC midnight, matching the daily cron's utcDay().
      const date = new Date(todayUTC - i * 86_400_000);
      const t = (DAYS - i) / DAYS; // 0 (oldest) .. 1 (today)
      // Gentle upward trend + a slow wobble so the line looks alive. USD nets
      // the credit-card liability; EUR is steadier. The i=0 point lands exactly
      // on the seeded account totals (27,500 USD / 6,300 EUR).
      const usd = Math.round(15500 + 12000 * t + 1800 * Math.sin(i / 18));
      const eur = Math.round(4300 + 1500 * t + 500 * Math.cos(i / 25));
      snapshots.push({ userId: user.id, date, byCurrency: { USD: usd, EUR: eur } });
    }
    await prisma.netWorthSnapshot.createMany({
      data: snapshots,
      skipDuplicates: true,
    });
  }

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
