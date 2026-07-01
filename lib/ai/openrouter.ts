import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Shared OpenRouter configuration, used by the chat route (streaming answers)
 * and the monthly-insight job (one-shot narrative). Centralized so model,
 * reasoning effort, and the API-key check live in one place.
 */

// Cheap, tool-calling-capable model by default; override per deploy.
export const CHAT_MODEL = process.env.CHAT_MODEL ?? "deepseek/deepseek-chat";

// Reasoning effort for reasoning-capable models. "minimal" keeps answers fast;
// "none" disables reasoning entirely. One of: xhigh|high|medium|low|minimal|none.
export const REASONING_EFFORT = (process.env.REASONING_EFFORT ??
	"minimal") as "xhigh" | "high" | "medium" | "low" | "minimal" | "none";

/**
 * The shared OpenRouter client, or `null` when `OPENROUTER_API_KEY` is unset so
 * callers can degrade gracefully (chat errors; monthly insight falls back to a
 * templated message) rather than throwing at import time.
 */
export function getOpenRouter() {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) return null;
	return createOpenRouter({ apiKey });
}
