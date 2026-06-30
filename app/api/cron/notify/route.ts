import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { route } from "@/lib/api/handler";
import { sendDailyDigests } from "@/lib/notifications/run";

/**
 * Cron entry point: send the daily Telegram digest to ALL linked users. Guarded
 * by the shared secret so it can be wired to a scheduler (e.g. Vercel Cron)
 * without a user session. Set `CRON_SECRET` and call with
 * `Authorization: Bearer <secret>`. Scheduled after `post-renewals` so the
 * digest reflects expenses posted earlier the same morning.
 */
async function handler(req: Request) {
	const secret = process.env.CRON_SECRET;
	if (!secret) {
		throw new ApiError(503, "CRON_SECRET not configured");
	}
	if (req.headers.get("authorization") !== `Bearer ${secret}`) {
		throw new ApiError(401, "Unauthorized");
	}
	const result = await sendDailyDigests();
	return NextResponse.json(result);
}

export const GET = route(handler);
export const POST = route(handler);
