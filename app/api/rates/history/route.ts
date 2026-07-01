import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { requireUserId } from "@/lib/api/session";
import { getSnapshotsForBase } from "@/lib/rates-snapshot";

/**
 * Historical exchange-rate snapshots for point-in-time conversion. `base` is the
 * target currency; the response `{ base, snapshots }` maps each UTC day to a
 * rate map already rebased to `base` (`rates[X]` = units of X per 1 base).
 * Charts pick the snapshot for each row's date via `pickRatesForDate`, falling
 * back to live `/api/rates` when a day has no snapshot.
 */

/** Parse a date query param; ignore missing or unparseable values. */
function parseDate(value: string | null): Date | undefined {
	if (!value) return undefined;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

export const GET = route(async (req: Request) => {
	await requireUserId();

	const url = new URL(req.url);
	const base = (url.searchParams.get("base") || "USD").toUpperCase();
	const from = parseDate(url.searchParams.get("from"));
	const to = parseDate(url.searchParams.get("to"));

	const snapshots = await getSnapshotsForBase(base, from, to);
	return NextResponse.json({ base, snapshots });
});
