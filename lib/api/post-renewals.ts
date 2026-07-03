import { prisma } from "@/lib/db";
import { autoPostDueDates, type Period } from "@/lib/recurring-dates";

/**
 * Post Expense rows for any subscription renewals that have come due since the
 * subscription was last posted. Idempotent: `lastPostedAt` advances to the most
 * recent posted renewal, so repeated calls never double-post.
 *
 * A subscription with `lastPostedAt = null` (auto-posting just enabled) backfills
 * every renewal from `startDate` through today, so the renewal due on the enable
 * day (and any earlier missed ones) is posted. Mirrors
 * {@link import("./post-recurring").postDueRecurring}.
 *
 * @param userId restrict to one user, or omit to process every user (cron).
 */
export async function postDueRenewals(
	userId?: string,
): Promise<{ posted: number; subscriptions: number }> {
	const subs = await prisma.subscription.findMany({
		where: { autoExpense: true, ...(userId ? { userId } : {}) },
	});
	const now = new Date();
	let posted = 0;

	for (const s of subs) {
		const due = autoPostDueDates(
			{ ...s, period: s.period as Period },
			now,
		);
		if (due.length === 0) continue;

		await prisma.$transaction([
			prisma.expense.createMany({
				data: due.map((d) => ({
					userId: s.userId,
					name: s.name,
					amount: s.price,
					currency: s.currency,
					date: d,
					tags: Array.from(new Set([...s.tags, "subscription"])),
				})),
			}),
			prisma.subscription.update({
				where: { id: s.id },
				data: { lastPostedAt: due[due.length - 1] },
			}),
		]);
		posted += due.length;
	}

	return { posted, subscriptions: subs.length };
}
