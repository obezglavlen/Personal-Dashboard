import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { route } from "@/lib/api/handler";
import { captureRatesSnapshot } from "@/lib/rates-snapshot";

/**
 * Cron entry point: snapshot today's exchange rates so historical figures
 * convert at the rate that was true then. Guarded by the shared secret; set
 * `CRON_SECRET` and call with `Authorization: Bearer <secret>`. Scheduled before
 * `post-renewals` so the day's rate is available when renewals/digests convert.
 */
async function handler(req: Request) {
	const secret = process.env.CRON_SECRET;
	if (!secret) {
		throw new ApiError(503, "CRON_SECRET not configured");
	}
	if (req.headers.get("authorization") !== `Bearer ${secret}`) {
		throw new ApiError(401, "Unauthorized");
	}
	const result = await captureRatesSnapshot();
	return NextResponse.json(result);
}

export const GET = route(handler);
export const POST = route(handler);
