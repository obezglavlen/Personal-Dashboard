import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { requireUserId } from "@/lib/api/session";
import { prisma } from "@/lib/db";
import { toDateKey } from "@/lib/rates-history";

/**
 * Read-only net-worth history for the signed-in user: `[{ date, byCurrency }]`,
 * oldest first. The trend chart converts each day's `byCurrency` at that day's
 * rate (via `useHistoricalRates`). Snapshots are written by the daily cron.
 */
async function list() {
	const userId = await requireUserId();
	const rows = await prisma.netWorthSnapshot.findMany({
		where: { userId },
		orderBy: { date: "asc" },
		select: { date: true, byCurrency: true },
	});
	return NextResponse.json(
		rows.map((r) => ({ date: toDateKey(r.date), byCurrency: r.byCurrency })),
	);
}

export const GET = route(list);
