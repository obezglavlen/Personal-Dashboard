import { prisma } from "@/lib/db";
import { getRates } from "@/lib/rates";
import {
	type RatesByDate,
	type RatesMap,
	rebaseRates,
	toDateKey,
} from "@/lib/rates-history";

/**
 * Server-side exchange-rate snapshotting. Snapshots are stored against a single
 * canonical base so one row per day covers every display currency; readers
 * rebase on the way out. See `lib/rates-history` for the pure rebase/pick math.
 */

export const CANONICAL_BASE = "USD";

/** UTC midnight `Date` for the day of `ref` (matches the `@db.Date` column). */
function utcDay(ref: Date): Date {
	return new Date(
		Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
	);
}

/**
 * Fetch today's live rates and upsert them as the snapshot for `ref`'s UTC day.
 * A failed fetch (empty map) is a no-op so we never store a blank snapshot that
 * would shadow a good one. Idempotent via the `(base, date)` unique key.
 */
export async function captureRatesSnapshot(
	ref: Date = new Date(),
): Promise<{ date: string; base: string; count: number }> {
	const rates = await getRates(CANONICAL_BASE);
	const count = Object.keys(rates).length;
	const date = utcDay(ref);
	const key = toDateKey(date);
	if (count === 0) return { date: key, base: CANONICAL_BASE, count: 0 };
	await prisma.exchangeRateSnapshot.upsert({
		where: { base_date: { base: CANONICAL_BASE, date } },
		update: { rates },
		create: { base: CANONICAL_BASE, date, rates },
	});
	return { date: key, base: CANONICAL_BASE, count };
}

/**
 * All stored snapshots, each rebased to `displayBase`, keyed by UTC day. Used by
 * the history route so charts can convert every row at its own day's rate.
 */
export async function getSnapshotsForBase(
	displayBase: string,
	from?: Date,
	to?: Date,
): Promise<RatesByDate> {
	const rows = await prisma.exchangeRateSnapshot.findMany({
		where: {
			base: CANONICAL_BASE,
			...(from || to
				? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
				: {}),
		},
		orderBy: { date: "asc" },
		select: { date: true, base: true, rates: true },
	});
	const out: RatesByDate = {};
	for (const row of rows) {
		out[toDateKey(row.date)] = rebaseRates(
			row.rates as RatesMap,
			row.base,
			displayBase,
		);
	}
	return out;
}
