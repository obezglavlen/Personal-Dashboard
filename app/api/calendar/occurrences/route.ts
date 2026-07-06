import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { requireUserId } from "@/lib/api/session";
import { listOccurrences } from "@/lib/calendar/service";

const DAY_MS = 86_400_000;

/**
 * Expanded calendar occurrences within a range. `from`/`to` are ISO instants;
 * defaults cover now through +90 days (enough for the dashboard widget). The
 * calendar page passes the visible month's bounds.
 */
async function handler(req: Request): Promise<NextResponse> {
	const userId = await requireUserId();
	const url = new URL(req.url);
	const now = new Date();
	const from = url.searchParams.get("from") ?? now.toISOString();
	const to =
		url.searchParams.get("to") ??
		new Date(now.getTime() + 90 * DAY_MS).toISOString();
	const occurrences = await listOccurrences(userId, from, to);
	return NextResponse.json(occurrences);
}

export const GET = route(handler);
