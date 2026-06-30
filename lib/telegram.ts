import { ApiError } from "@/lib/api/errors";

/**
 * Send a message via the Telegram Bot API. Used by the daily-digest cron and
 * the "send test" button in Settings.
 *
 * Throws `ApiError(503)` when `TELEGRAM_BOT_TOKEN` is unset (mirrors the
 * `CRON_SECRET` guard), and `ApiError(502)` when Telegram rejects the request
 * (e.g. an invalid chat id), surfacing Telegram's own description so the user
 * can fix a mistyped id.
 *
 * `text` is sent with `parse_mode: "HTML"`, so any user-supplied content
 * interpolated into it must be escaped first — see {@link escapeHtml}.
 */
export async function sendTelegramMessage(
	chatId: string,
	text: string,
): Promise<void> {
	const token = process.env.TELEGRAM_BOT_TOKEN;
	if (!token) {
		throw new ApiError(503, "TELEGRAM_BOT_TOKEN not configured");
	}

	const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			chat_id: chatId,
			text,
			parse_mode: "HTML",
			disable_web_page_preview: true,
		}),
	});

	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			description?: string;
		} | null;
		const detail = body?.description ? `: ${body.description}` : "";
		throw new ApiError(502, `Telegram API error (${res.status})${detail}`);
	}
}

/** Escape the five characters that are significant in Telegram HTML parse mode. */
export function escapeHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
