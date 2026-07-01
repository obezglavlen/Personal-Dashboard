import { generateText } from "ai";
import { CHAT_MODEL, getOpenRouter, REASONING_EFFORT } from "@/lib/ai/openrouter";
import { prisma } from "@/lib/db";
import { getRates } from "@/lib/rates";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram";
import {
	buildInsightMessage,
	monthBeforeRange,
	monthLabel,
	previousMonthRange,
	type SpendingSummary,
	summarizeSpending,
} from "./monthly-insight";

/**
 * Ask the LLM for a short narrative from the spending summary. Returns null when
 * no key is configured or the call fails, so the caller falls back to the
 * deterministic template. The model gets only the pre-computed figures — it
 * never sees raw data and is told not to invent numbers.
 */
async function llmNarrative(
	summary: SpendingSummary,
	label: string,
	base: string,
): Promise<string | null> {
	const openrouter = getOpenRouter();
	if (!openrouter) return null;
	try {
		const { text } = await generateText({
			model: openrouter.chat(CHAT_MODEL),
			system: [
				"You write a short monthly spending recap for a personal finance app,",
				"delivered over Telegram. Rules:",
				"- Use ONLY the numbers provided; never invent figures.",
				"- Plain text with optional <b>bold</b>. No markdown, no other HTML tags.",
				"- At most 6 short lines. Friendly, concrete, one actionable observation.",
			].join("\n"),
			prompt: JSON.stringify({ month: label, currency: base, ...summary }),
			providerOptions: {
				openrouter: { reasoning: { effort: REASONING_EFFORT } },
			},
		});
		const t = text.trim();
		return t
			? `<b>📊 ${escapeHtml(label)} — spending insight</b>\n\n${t}`
			: null;
	} catch (e) {
		console.error("Monthly insight LLM failed, using template:", e);
		return null;
	}
}

/**
 * Send last month's spending insight to every user who linked a Telegram chat
 * id and left insights on. Per-user try/catch isolates failures. Returns counts.
 *
 * @param userId restrict to one user, or omit to process every eligible user.
 */
export async function sendMonthlyInsights(
	userId?: string,
	ref: Date = new Date(),
): Promise<{ sent: number; users: number }> {
	const prev = previousMonthRange(ref);
	const before = monthBeforeRange(ref);
	const label = monthLabel(prev.start);

	const settingsList = await prisma.userSettings.findMany({
		where: {
			telegramChatId: { not: null },
			notifyInsights: true,
			// Idempotency: skip users already handled for this insight month, so a
			// timed-out invocation can be safely re-run (resumes the rest, never
			// double-sends).
			OR: [{ lastInsightAt: null }, { lastInsightAt: { lt: prev.end } }],
			...(userId ? { userId } : {}),
		},
	});

	const stamp = new Date();

	const mapE = (e: { amount: unknown; currency: string; tags: string[] }) => ({
		amount: Number(e.amount),
		currency: e.currency,
		tags: e.tags,
	});

	let sent = 0;
	for (const s of settingsList) {
		const chatId = s.telegramChatId;
		if (!chatId) continue;
		try {
			const base = s.currency || "USD";
			const [current, prior, rates] = await Promise.all([
				prisma.expense.findMany({
					where: { userId: s.userId, date: { gte: prev.start, lt: prev.end } },
					select: { amount: true, currency: true, tags: true },
				}),
				prisma.expense.findMany({
					where: {
						userId: s.userId,
						date: { gte: before.start, lt: before.end },
					},
					select: { amount: true, currency: true, tags: true },
				}),
				getRates(base),
			]);

			const summary = summarizeSpending(
				current.map(mapE),
				prior.map(mapE),
				base,
				rates,
			);
			// Zero-spend gate: buildInsightMessage returns null when there's nothing
			// to report. Check it BEFORE the LLM so we neither send a pointless "$0"
			// message nor waste an LLM call; then prefer the LLM narrative if any.
			const fallback = buildInsightMessage(summary, label, base);
			if (!fallback) {
				await prisma.userSettings.update({
					where: { userId: s.userId },
					data: { lastInsightAt: stamp },
				});
				continue;
			}
			const message = (await llmNarrative(summary, label, base)) ?? fallback;

			await sendTelegramMessage(chatId, message);
			// Stamp only after a successful send, so a failed send retries next run.
			await prisma.userSettings.update({
				where: { userId: s.userId },
				data: { lastInsightAt: stamp },
			});
			sent++;
		} catch (e) {
			console.error(`Monthly insight failed for user ${s.userId}:`, e);
		}
	}

	return { sent, users: settingsList.length };
}
