/**
 * Pure, client-safe helpers for point-in-time currency conversion. No network,
 * no Prisma — so both the `/api/rates/history` route (server) and the report
 * charts (client) share them, and they are unit-testable in the node env.
 *
 * Rate maps follow the frankfurter shape used everywhere else: `rates[X]` =
 * units of X per 1 base — see {@link import("@/lib/format").convertToBase}.
 */

export type RatesMap = Record<string, number>;
/** Rates keyed by UTC day, `"YYYY-MM-DD" -> RatesMap`. */
export type RatesByDate = Record<string, RatesMap>;

/** UTC `"YYYY-MM-DD"` key for a date. */
export function toDateKey(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/**
 * Re-express `rates` (units per 1 `storedBase`) against `wantBase` instead, so
 * `convertToBase(amount, from, wantBase, rebased)` works. Returns `{}` when the
 * pivot rate for `wantBase` is missing (can't rebase). The returned map always
 * includes `storedBase` and `wantBase` (= 1) so conversions in either survive.
 */
export function rebaseRates(
	rates: RatesMap,
	storedBase: string,
	wantBase: string,
): RatesMap {
	const from = storedBase.toUpperCase();
	const to = wantBase.toUpperCase();
	if (from === to) return { ...rates, [from]: 1 };
	const pivot = rates[to];
	if (!pivot) return {};
	const out: RatesMap = {};
	for (const [k, v] of Object.entries(rates)) out[k] = v / pivot;
	out[from] = 1 / pivot;
	out[to] = 1;
	return out;
}

/**
 * Rates to use for `isoDate` (a `"YYYY-MM-DD"` or ISO datetime; only the day
 * matters): the newest snapshot on or before that day. Falls back to the
 * earliest snapshot when the date predates all of them, and to `{}` when there
 * are none — callers then fall back to live rates.
 */
export function pickRatesForDate(
	byDate: RatesByDate,
	isoDate: string,
	sortedKeys?: string[],
): RatesMap {
	const day = isoDate.slice(0, 10);
	// Callers that pick per-row (charts/reports) pass pre-sorted keys so the sort
	// runs once per render, not once per row.
	const keys = sortedKeys ?? Object.keys(byDate).sort();
	if (keys.length === 0) return {};
	let chosen: string | null = null;
	for (const k of keys) {
		if (k <= day) chosen = k;
		else break;
	}
	return byDate[chosen ?? keys[0]];
}
