import { prisma } from "@/lib/db";
import { type Period, recurringDueDates } from "@/lib/recurring-dates";

/**
 * Post rows for any recurring transactions that have come due since they were
 * last posted. Mirrors {@link import("./post-renewals").postDueRenewals}:
 * idempotent via `lastPostedAt`, batched in a `$transaction`. Expenses post to
 * `Expense`; income posts to `TaxRecord` (type "income"). Honours `endDate`.
 *
 * A recurrence with `lastPostedAt = null` (auto-post just enabled) is baselined
 * to now without backfilling — only charges after enabling are posted.
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
		if (r.lastPostedAt == null) {
			await prisma.recurringTransaction.update({
				where: { id: r.id },
				data: { lastPostedAt: now },
			});
			continue;
		}

		const due = recurringDueDates(
			r.startDate.toISOString(),
			r.period as Period,
			r.lastPostedAt.toISOString(),
			r.endDate ? r.endDate.toISOString() : null,
			now,
		);
		if (due.length === 0) continue;

		const advance = prisma.recurringTransaction.update({
			where: { id: r.id },
			data: { lastPostedAt: due[due.length - 1] },
		});

		if (r.type === "expense") {
			const tags = r.tags.length
				? r.tags
				: r.category
					? [r.category]
					: [];
			await prisma.$transaction([
				prisma.expense.createMany({
					data: due.map((d) => ({
						userId: r.userId,
						name: r.name,
						amount: r.amount,
						currency: r.currency,
						date: d,
						tags,
					})),
				}),
				advance,
			]);
		} else {
			await prisma.$transaction([
				prisma.taxRecord.createMany({
					data: due.map((d) => ({
						userId: r.userId,
						type: "income",
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
