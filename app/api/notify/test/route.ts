import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { route } from "@/lib/api/handler";
import { requireUserId } from "@/lib/api/session";
import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * Send a test message to the current user's linked Telegram chat id, so they
 * can confirm the id they pasted in Settings actually reaches them.
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
	await sendTelegramMessage(
		settings.telegramChatId,
		"✅ <b>Home Dashboard</b> connected. Your daily digest will arrive here.",
	);
	return NextResponse.json({ success: true });
}

export const POST = route(handler);
