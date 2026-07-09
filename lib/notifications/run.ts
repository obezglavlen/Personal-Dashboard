import { serializeCalendarEvent } from "@/lib/api/resources";
import { currentMonthRange } from "@/lib/budget";
import { type CalendarEventRow, upcomingReminders } from "@/lib/calendar/expand";
import { prisma } from "@/lib/db";
import { getRates } from "@/lib/rates";
import type { Period } from "@/lib/subscriptions";
import { sendTelegramMessage } from "@/lib/telegram";
import { buildDigest, type DigestData } from "./digest";

/**
 * Send the daily Telegram digest to every user who has linked a chat id, or to
 * a single user (the per-user "send test"/manual path). Structured like
 * `postDueRenewals`: each user is isolated in try/catch so one failure (e.g. a
 * stale chat id) never aborts the batch. Users whose digest is empty are
 * skipped without a send. Returns counts for the cron response.
 *
 * @param userId restrict to one user, or omit to process every linked user (cron).
 */
export async function sendDailyDigests(
	userId?: string,
): Promise<{ sent: number; users: number }> {
	const now = new Date();
	const { start, end } = currentMonthRange(now);

	const settingsList = await prisma.userSettings.findMany({
		where: {
			telegramChatId: { not: null },
			...(userId ? { userId } : {}),
		},
	});

	let sent = 0;
	for (const s of settingsList) {
		const chatId = s.telegramChatId;
		if (!chatId) continue;
		try {
			const displayCurrency = s.currency || "USD";

			const [
				subs,
				budgets,
				expenses,
				tasks,
				calendarRows,
				allExpenses,
				income,
				taxRecords,
				rates,
			] = await Promise.all([
				prisma.subscription.findMany({ where: { userId: s.userId } }),
				prisma.budget.findMany({ where: { userId: s.userId } }),
				prisma.expense.findMany({
					where: { userId: s.userId, date: { gte: start, lt: end } },
				}),
				prisma.task.findMany({
					where: {
						userId: s.userId,
						status: { not: "done" },
						dueDate: { not: null },
					},
				}),
				prisma.calendarEvent.findMany({ where: { userId: s.userId } }),
				// All-time rows for the cumulative Total-net figure.
				prisma.expense.findMany({ where: { userId: s.userId } }),
				prisma.income.findMany({ where: { userId: s.userId } }),
				prisma.taxRecord.findMany({ where: { userId: s.userId } }),
				getRates(displayCurrency),
			]);

			const events = upcomingReminders(
				calendarRows.map(serializeCalendarEvent) as CalendarEventRow[],
				now,
			);

			const data: DigestData = {
				subscriptions: subs.map((x) => ({
					name: x.name,
					price: Number(x.price),
					period: x.period as Period,
					startDate: x.startDate.toISOString(),
					currency: x.currency,
				})),
				budgets: budgets.map((b) => ({
					name: b.name,
					amount: Number(b.amount),
					currency: b.currency,
					tags: b.tags,
				})),
				expenses: expenses.map((e) => ({
					amount: Number(e.amount),
					currency: e.currency,
					date: e.date.toISOString(),
					tags: e.tags,
				})),
				tasks: tasks.map((t) => ({
					title: t.title,
					dueDate: t.dueDate ? t.dueDate.toISOString() : null,
					status: t.status,
				})),
				events,
				income: income
					.filter((r) => r.amount != null)
					.map((r) => ({
						date: r.date.toISOString(),
						amount: Number(r.amount),
						currency: r.currency,
					})),
				netExpenses: [
					...allExpenses.map((e) => ({
						date: e.date.toISOString(),
						amount: Number(e.amount),
						currency: e.currency,
					})),
					...taxRecords
						.filter((r) => r.amount != null)
						.map((r) => ({
							date: r.date.toISOString(),
							amount: Number(r.amount),
							currency: r.currency,
						})),
				],
				displayCurrency,
				rates,
				prefs: {
					renewals: s.notifyRenewals,
					budgets: s.notifyBudgets,
					tasks: s.notifyTasks,
					events: s.notifyEvents ?? true,
					totalNet: s.notifyTotalNet ?? true,
					budgetThreshold: (s.budgetAlertThreshold ?? 80) / 100,
				},
			};

			const message = buildDigest(data, now);
			if (!message) continue;

			await sendTelegramMessage(chatId, message);
			sent++;
		} catch (e) {
			console.error(`Daily digest failed for user ${s.userId}:`, e);
		}
	}

	return { sent, users: settingsList.length };
}
