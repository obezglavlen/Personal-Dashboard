import { prisma } from "@/lib/db";
import { type Period, renewalsDue } from "@/lib/subscriptions";

/**
 * Post Expense rows for any subscription renewals that have come due since the
 * subscription was last posted. Idempotent: `lastPostedAt` advances to the most
 * recent posted renewal, so repeated calls never double-post.
 *
 * A subscription with `lastPostedAt = null` (auto-posting just enabled) is
 * *baselined* to now without backfilling its history — only renewals that
 * occur after enabling are posted.
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
		// First time enabled: baseline, don't backfill past charges.
		if (s.lastPostedAt == null) {
			await prisma.subscription.update({
				where: { id: s.id },
				data: { lastPostedAt: now },
			});
			continue;
		}

		const due = renewalsDue(
			s.startDate.toISOString(),
			s.period as Period,
			s.lastPostedAt.toISOString(),
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
