import { prisma } from "@/lib/db";
import { toDateKey } from "@/lib/rates-history";
import { sumBalancesByCurrency } from "./snapshot-math";

/**
 * Server-side net-worth snapshotting. Records one row per user per UTC day with
 * balances grouped by currency, so the trend chart can plot net worth over time
 * (converted at each day's rate). Idempotent via the `(userId, date)` key.
 */

function utcDay(ref: Date): Date {
	return new Date(
		Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
	);
}

export async function captureNetWorthSnapshots(
	userId?: string,
	ref: Date = new Date(),
): Promise<{ users: number; date: string }> {
	const accounts = await prisma.financialAccount.findMany({
		where: userId ? { userId } : {},
		select: { userId: true, balance: true, currency: true },
	});

	const byUser = new Map<string, { balance: number; currency: string }[]>();
	for (const a of accounts) {
		const list = byUser.get(a.userId) ?? [];
		list.push({ balance: Number(a.balance), currency: a.currency });
		byUser.set(a.userId, list);
	}

	// Include users who previously had a snapshot but have since deleted all
	// their accounts, so their trend records 0 for today instead of freezing at
	// the last non-zero value. An empty balance list sums to {} → net worth 0.
	const priorUsers = await prisma.netWorthSnapshot.findMany({
		where: userId ? { userId } : {},
		select: { userId: true },
		distinct: ["userId"],
	});
	for (const { userId: uid } of priorUsers) {
		if (!byUser.has(uid)) byUser.set(uid, []);
	}

	const date = utcDay(ref);
	let users = 0;
	for (const [uid, list] of byUser) {
		const byCurrency = sumBalancesByCurrency(list);
		await prisma.netWorthSnapshot.upsert({
			where: { userId_date: { userId: uid, date } },
			update: { byCurrency },
			create: { userId: uid, date, byCurrency },
		});
		users++;
	}
	return { users, date: toDateKey(date) };
}
