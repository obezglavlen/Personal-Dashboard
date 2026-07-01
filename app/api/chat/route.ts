import {
	convertToModelMessages,
	stepCountIs,
	streamText,
	type UIMessage,
} from "ai";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/api/session";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { buildTools } from "@/lib/ai/tools";
import { CHAT_MODEL, getOpenRouter, REASONING_EFFORT } from "@/lib/ai/openrouter";

// The agent loops over tool calls, so it can run longer than a plain request.
// Vercel caps this per plan — raise on Pro if multi-step answers get cut off.
export const maxDuration = 30;

function systemPrompt(currency: string): string {
	const today = new Date().toISOString().slice(0, 10);
	return [
		"You are the assistant for a personal home dashboard.",
		"You answer questions about — and can create records in — THIS user's own",
		"data: expenses, budgets, subscriptions, tasks, net worth, goals, taxes,",
		"notes, and bookmarks.",
		"",
		"Rules:",
		"- Use the get* tools to read data. Never invent numbers, dates, or",
		"  records. If a tool returns nothing, say so plainly.",
		"- Use the create* tools to add records when the user clearly asks you to",
		"  (e.g. 'log $12 lunch', 'add a task'). Each create is shown to the user",
		"  for approval before it is saved, so call it once with your best guess",
		"  of the fields rather than asking many follow-up questions. Do not claim",
		"  a record was saved unless the tool returns a successful result.",
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

	const openrouter = getOpenRouter();
	if (!openrouter) {
		return toErrorResponse(
			new ApiError(503, "OPENROUTER_API_KEY not configured"),
		);
	}

	const result = streamText({
		model: openrouter.chat(CHAT_MODEL),
		system: systemPrompt(settings?.currency ?? "USD"),
		messages: await convertToModelMessages(messages),
		tools: buildTools(userId),
		// Allow several tool round-trips so multi-step questions ("am I over any
		// budget, and what's my biggest expense?") can resolve in one turn.
		stopWhen: stepCountIs(8),
		providerOptions: {
			openrouter: {
				// Minimize chain-of-thought on reasoning models for faster answers.
				// Effort: xhigh|high|medium|low|minimal|none. Override via env.
				reasoning: { effort: REASONING_EFFORT },
			},
		},
	});

	return result.toUIMessageStreamResponse({
		// Without this, the SDK masks every stream error as "An error occurred."
		// so a mid-stream failure (e.g. a rate-limited free model on a tool
		// continuation step) shows as reasoning followed by a blank answer.
		// Surface the real reason instead.
		onError: (error) => {
			console.error("chat stream error:", error);
			if (error instanceof Error) return error.message;
			return "The model failed to respond. Please try again.";
		},
	});
}
