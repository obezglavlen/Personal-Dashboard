import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { postDueRenewals } from "@/lib/api/post-renewals";

/**
 * Cron entry point: post due subscription renewals for ALL users. Guarded by a
 * shared secret so it can be wired to a scheduler (e.g. Vercel Cron) without a
 * user session. Set `CRON_SECRET` and call with `Authorization: Bearer <secret>`.
 */
async function handler(req: Request) {
	const secret = process.env.CRON_SECRET;
	if (!secret) {
		throw new ApiError(503, "CRON_SECRET not configured");
	}
	if (req.headers.get("authorization") !== `Bearer ${secret}`) {
		throw new ApiError(401, "Unauthorized");
	}
	const result = await postDueRenewals();
	return NextResponse.json(result);
}

export const GET = route(handler);
export const POST = route(handler);
