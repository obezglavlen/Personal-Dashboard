import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { postDueRecurring } from "@/lib/api/post-recurring";
import { postDueRenewals } from "@/lib/api/post-renewals";
import { captureNetWorthSnapshots } from "@/lib/net-worth/snapshot";

/**
 * Cron entry point for ALL users: post due subscription renewals and recurring
 * transactions, then record a daily net-worth snapshot (last, so it reflects
 * everything posted this morning). Guarded by a shared secret so it can be
 * wired to a scheduler (e.g. Vercel Cron) without a user session. Set
 * `CRON_SECRET` and call with `Authorization: Bearer <secret>`.
 */
async function handler(req: Request) {
	const secret = process.env.CRON_SECRET;
	if (!secret) {
		throw new ApiError(503, "CRON_SECRET not configured");
	}
	if (req.headers.get("authorization") !== `Bearer ${secret}`) {
		throw new ApiError(401, "Unauthorized");
	}
	const renewals = await postDueRenewals();
	const recurring = await postDueRecurring();
	const netWorth = await captureNetWorthSnapshots();
	return NextResponse.json({ renewals, recurring, netWorth });
}

export const GET = route(handler);
export const POST = route(handler);
