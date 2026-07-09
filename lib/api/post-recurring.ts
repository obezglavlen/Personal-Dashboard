import { prisma } from "@/lib/db";
import { autoPostDueDates, type Period } from "@/lib/recurring-dates";

/**
 * Post rows for any recurring transactions that have come due since they were
 * last posted. Mirrors {@link import("./post-renewals").postDueRenewals}:
 * idempotent via `lastPostedAt`, batched in a `$transaction`. Expenses post to
 * `Expense`; income posts to `Income`. Honours `endDate`.
 *
 * A recurrence with `lastPostedAt = null` (auto-post just enabled, or freshly
 * created) backfills every charge from `startDate` through today, so the charge
 * due on the enable day (and any earlier missed ones) is posted.
 *
 * @param userId restrict to one user, or omit to process every user (cron).
 */
export async function postDueRecurring(
	userId?: string,
): Promise<{ posted: number; recurring: number }> {
	const rows = await prisma.recurringTransaction.findMany({
		where: { autoPost: true, ...(userId ? { userId } : {}) },
	});
	const now = new Date();
	let posted = 0;

	for (const r of rows) {
		const due = autoPostDueDates(
			{ ...r, period: r.period as Period },
			now,
		);
		if (due.length === 0) continue;

		const advance = prisma.recurringTransaction.update({
			where: { id: r.id },
			data: { lastPostedAt: due[due.length - 1] },
		});

		if (r.type === "expense") {
			await prisma.$transaction([
				prisma.expense.createMany({
					data: due.map((d) => ({
						userId: r.userId,
						name: r.name,
						amount: r.amount,
						currency: r.currency,
						date: d,
						tags: Array.from(new Set([...r.tags, "recurring"])),
					})),
				}),
				advance,
			]);
		} else {
			await prisma.$transaction([
				prisma.income.createMany({
					data: due.map((d) => ({
						userId: r.userId,
						amount: r.amount,
						currency: r.currency,
						date: d,
						description: r.name,
					})),
				}),
				advance,
			]);
		}
		posted += due.length;
	}

	return { posted, recurring: rows.length };
}
