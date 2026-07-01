/**
 * Date-range presets for the Reports page. Ranges are half-open UTC intervals
 * `[start, end)` so a row on the last day is included and adjacent ranges never
 * double-count. Pure and side-effect-free (inject `ref` for tests).
 */

export interface DateRange {
	start: Date;
	end: Date;
}

export type RangeKey = "this-month" | "last-month" | "ytd" | "12m";

export const RANGE_PRESETS: { key: RangeKey; label: string }[] = [
	{ key: "this-month", label: "This month" },
	{ key: "last-month", label: "Last month" },
	{ key: "ytd", label: "Year to date" },
	{ key: "12m", label: "Last 12 months" },
];

const monthStart = (y: number, m: number) => new Date(Date.UTC(y, m, 1));

/** Resolve a preset to a concrete `[start, end)` range. */
export function presetRange(key: RangeKey, ref: Date = new Date()): DateRange {
	const y = ref.getUTCFullYear();
	const m = ref.getUTCMonth();
	const d = ref.getUTCDate();
	switch (key) {
		case "this-month":
			return { start: monthStart(y, m), end: monthStart(y, m + 1) };
		case "last-month":
			return { start: monthStart(y, m - 1), end: monthStart(y, m) };
		case "ytd":
			// Jan 1 through the end of today (start of tomorrow, exclusive).
			return { start: monthStart(y, 0), end: new Date(Date.UTC(y, m, d + 1)) };
		case "12m":
			// The current month plus the previous 11 full months.
			return { start: monthStart(y, m - 11), end: monthStart(y, m + 1) };
	}
}

/**
 * Custom `[start, end)` from two `"YYYY-MM-DD"` inputs. `end` is pushed to the
 * start of the day after `to` so `to` itself is included. Returns null if either
 * bound is missing or unparseable, or if `from` is after `to`.
 */
export function customRange(from: string, to: string): DateRange | null {
	if (!from || !to) return null;
	const start = new Date(`${from}T00:00:00.000Z`);
	const end = new Date(`${to}T00:00:00.000Z`);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
	if (start > end) return null;
	return { start, end: new Date(end.getTime() + 86_400_000) };
}

/** Whether an ISO date/datetime falls in `[start, end)`. */
export function isInRange(iso: string, range: DateRange): boolean {
	const d = new Date(iso);
	return d >= range.start && d < range.end;
}
