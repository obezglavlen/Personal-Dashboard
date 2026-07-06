/**
 * Calendar recurrence date math. A recurring event stores a `startAt` instant, a
 * `recurrence` unit, and an optional `recurrenceEnd`; its occurrences are derived
 * by stepping that unit forward from the start. Pure and side-effect-free so it
 * is unit-testable and shared by the occurrence expander, the API, and the
 * daily-digest reminder scan.
 *
 * All stepping is done in UTC, preserving the start's time-of-day. Weekly is a
 * 7-day step; monthly/yearly keep the day-of-month, clamping to the target
 * month's length (Jan 31 + 1mo → Feb 28/29) and always computing from the
 * original start so repeated clamping never drifts.
 */

import { utcDay } from "@/lib/recurring-dates";

export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";

export const RECURRENCES: Recurrence[] = [
	"none",
	"daily",
	"weekly",
	"monthly",
	"yearly",
];

/** Step `start` forward by `n` recurrence units, preserving UTC time-of-day. */
export function addUnit(start: Date, recurrence: Recurrence, n: number): Date {
	const y = start.getUTCFullYear();
	const mo = start.getUTCMonth();
	const d = start.getUTCDate();
	const h = start.getUTCHours();
	const mi = start.getUTCMinutes();
	const s = start.getUTCSeconds();
	const ms = start.getUTCMilliseconds();
	switch (recurrence) {
		case "daily":
			return new Date(Date.UTC(y, mo, d + n, h, mi, s, ms));
		case "weekly":
			return new Date(Date.UTC(y, mo, d + 7 * n, h, mi, s, ms));
		case "monthly": {
			const lastDay = new Date(Date.UTC(y, mo + n + 1, 0)).getUTCDate();
			return new Date(Date.UTC(y, mo + n, Math.min(d, lastDay), h, mi, s, ms));
		}
		case "yearly": {
			const lastDay = new Date(Date.UTC(y + n, mo + 1, 0)).getUTCDate();
			return new Date(Date.UTC(y + n, mo, Math.min(d, lastDay), h, mi, s, ms));
		}
		default:
			return new Date(start);
	}
}

/**
 * All occurrence-start instants of an event that fall within `[from, to]`
 * (inclusive), capped by `until` (inclusive by day) when set. A non-recurring
 * event yields `[start]` if it lies in the window, else `[]`.
 */
export function expandRecurrence(
	start: Date,
	recurrence: Recurrence,
	until: Date | null,
	from: Date,
	to: Date,
): Date[] {
	if (recurrence === "none") {
		return start >= from && start <= to ? [start] : [];
	}

	const untilDay = until ? utcDay(until) : null;

	// Fast-forward daily/weekly so a series that began long before the window
	// doesn't scan one step per elapsed day. Monthly/yearly are cheap (≤12/yr).
	let nStart = 0;
	if (recurrence === "daily" || recurrence === "weekly") {
		const stepMs = (recurrence === "weekly" ? 7 : 1) * 86_400_000;
		const gap = utcDay(from).getTime() - utcDay(start).getTime();
		if (gap > 0) nStart = Math.max(0, Math.floor(gap / stepMs) - 1);
	}

	const out: Date[] = [];
	// Guard against pathological spans; the window normally bounds the loop.
	const GUARD = 100_000;
	for (let i = 0, n = nStart; i < GUARD; i++, n++) {
		const occ = addUnit(start, recurrence, n);
		if (occ > to) break;
		if (untilDay && utcDay(occ) > untilDay) break;
		if (occ >= from) out.push(occ);
	}
	return out;
}
