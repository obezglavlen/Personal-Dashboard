import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { route } from "@/lib/api/handler";
import { sendMonthlyInsights } from "@/lib/notifications/monthly-insight-run";

// The LLM narrative can take a few seconds per user; allow the max (Vercel
// clamps to the plan's ceiling). Sending is idempotent via lastInsightAt, so if
// a run still times out, the next invocation safely resumes the remaining users.
export const maxDuration = 300;

/**
 * Cron entry point: send the previous month's spending insight to ALL eligible
 * users. Guarded by the shared secret; set `CRON_SECRET` and call with
 * `Authorization: Bearer <secret>`. Scheduled for the 1st of each month.
 */
async function handler(req: Request) {
	const secret = process.env.CRON_SECRET;
	if (!secret) {
		throw new ApiError(503, "CRON_SECRET not configured");
	}
	if (req.headers.get("authorization") !== `Bearer ${secret}`) {
		throw new ApiError(401, "Unauthorized");
	}
	const result = await sendMonthlyInsights();
	return NextResponse.json(result);
}

export const GET = route(handler);
export const POST = route(handler);
