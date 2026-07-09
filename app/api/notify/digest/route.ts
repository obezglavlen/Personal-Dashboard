import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { route } from "@/lib/api/handler";
import { requireUserId } from "@/lib/api/session";
import { prisma } from "@/lib/db";
import { sendDailyDigests } from "@/lib/notifications/run";

/**
 * Manually send the current user's daily digest now, for testing digest
 * content/prefs without waiting for the cron. Mirrors `/api/notify/test` but
 * sends the real digest instead of a fixed confirmation message.
 */
async function handler() {
	const userId = await requireUserId();
	const settings = await prisma.userSettings.findUnique({ where: { userId } });
	if (!settings?.telegramChatId) {
		throw new ApiError(
			400,
			"No Telegram chat id saved — add one and save first.",
		);
	}
	const result = await sendDailyDigests(userId);
	if (result.sent === 0) {
		throw new ApiError(
			400,
			"Nothing to report right now — the digest would be empty.",
		);
	}
	return NextResponse.json({ success: true });
}

export const POST = route(handler);
