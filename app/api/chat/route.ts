import {
	convertToModelMessages,
	stepCountIs,
	streamText,
	type UIMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/api/session";
import { toErrorResponse } from "@/lib/api/errors";
import { buildTools } from "@/lib/ai/tools";

// The agent loops over tool calls, so it can run longer than a plain request.
// Vercel caps this per plan — raise on Pro if multi-step answers get cut off.
export const maxDuration = 30;

// Cheap, tool-calling-capable model by default; override per deploy.
const MODEL = process.env.CHAT_MODEL ?? "deepseek/deepseek-chat";

function systemPrompt(currency: string): string {
	const today = new Date().toISOString().slice(0, 10);
	return [
		"You are the assistant for a personal home dashboard.",
		"You answer questions about THIS user's own data: expenses, budgets,",
		"subscriptions, tasks, net worth, goals, taxes, notes, and bookmarks.",
		"",
		"Rules:",
		"- Only use the provided tools to get data. Never invent numbers, dates,",
		"  or records. If a tool returns nothing, say so plainly.",
		"- Money is grouped by currency. Do not sum across currencies unless you",
		"  first call getExchangeRates and convert; show your conversion.",
		`- The user's default display currency is ${currency}.`,
		`- Today is ${today}. Resolve relative dates ('this month', 'last week')`,
		"  against it before calling tools.",
		"- Be concise. Prefer short tables or bullet lists for figures.",
	].join("\n");
}

export async function POST(req: Request) {
	let userId: string;
	try {
		userId = await requireUserId();
	} catch (err) {
		return toErrorResponse(err);
	}

	const { messages }: { messages: UIMessage[] } = await req.json();

	const settings = await prisma.userSettings.findUnique({
		where: { userId },
		select: { currency: true },
	});

	const openrouter = createOpenRouter({
		apiKey: process.env.OPENROUTER_API_KEY,
	});

	const result = streamText({
		model: openrouter.chat(MODEL),
		system: systemPrompt(settings?.currency ?? "USD"),
		messages: await convertToModelMessages(messages),
		tools: buildTools(userId),
		// Allow several tool round-trips so multi-step questions ("am I over any
		// budget, and what's my biggest expense?") can resolve in one turn.
		stopWhen: stepCountIs(8),
	});

	return result.toUIMessageStreamResponse();
}
