/**
 * Recurrence date math, shared by subscription auto-posting and the generic
 * RecurringTransaction auto-posting. A recurrence stores a `startDate` and a
 * `period` (`monthly` | `annual`); charges are derived by stepping that period
 * forward from the start. Pure and side-effect-free (inject `ref` for tests).
 */

export type Period = "monthly" | "annual";

/** Date at UTC midnight for `d` (drops the time-of-day). */
export function utcDay(d: Date): Date {
	return new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
	);
}

/**
 * Add `n` calendar months in UTC, keeping the original day-of-month but
 * clamping to the target month's length (e.g. Jan 31 + 1mo → Feb 28/29). Always
 * called from the original start so repeated clamping never drifts.
 */
function addMonthsUTC(d: Date, n: number): Date {
	const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
	const lastDay = new Date(
		Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
	).getUTCDate();
	return new Date(
		Date.UTC(
			base.getUTCFullYear(),
			base.getUTCMonth(),
			Math.min(d.getUTCDate(), lastDay),
		),
	);
}

/**
 * Next renewal date (UTC midnight) on or after `ref`. If the start is in the
 * future, the first charge is the start date itself.
 */
export function nextRenewal(
	startISO: string,
	period: Period,
	ref: Date = new Date(),
): Date {
	const start = new Date(startISO);
	const startDay = utcDay(start);
	const refDay = utcDay(ref);
	if (startDay >= refDay) return startDay;

	const step = period === "annual" ? 12 : 1;
	let n = step;
	let cand = addMonthsUTC(start, n);
	while (cand < refDay) {
		n += step;
		cand = addMonthsUTC(start, n);
	}
	return cand;
}

/** Whole days from `ref` (date-only) to `date` (date-only). 0 = today. */
export function daysUntil(date: Date, ref: Date = new Date()): number {
	const ms = utcDay(date).getTime() - utcDay(ref).getTime();
	return Math.round(ms / 86_400_000);
}

/**
 * All renewal dates (UTC midnight) from the start through `ref`, excluding any
 * on or before `sinceISO` (the last already-posted renewal). The start date
 * itself counts as the first charge. Used by auto-posting to find which charges
 * still need to be posted, idempotently.
 */
export function renewalsDue(
	startISO: string,
	period: Period,
	sinceISO: string | null,
	ref: Date = new Date(),
): Date[] {
	const refDay = utcDay(ref);
	const since = sinceISO ? utcDay(new Date(sinceISO)) : null;
	const step = period === "annual" ? 12 : 1;
	const dates: Date[] = [];
	let n = 0;
	let cand = addMonthsUTC(new Date(startISO), 0);
	// Guard against pathological inputs (e.g. start far in the past) — a decade
	// of monthly charges is the practical ceiling.
	let guard = 0;
	while (cand <= refDay && guard < 5000) {
		if (!since || cand > since) dates.push(cand);
		n += step;
		cand = addMonthsUTC(new Date(startISO), n);
		guard++;
	}
	return dates;
}

/**
 * Like {@link renewalsDue} but honours an optional `endISO`: no charge is posted
 * for a day after the recurrence ends. Passing `endISO` in the past effectively
 * caps posting at the end date.
 */
export function recurringDueDates(
	startISO: string,
	period: Period,
	sinceISO: string | null,
	endISO: string | null,
	ref: Date = new Date(),
): Date[] {
	const cap = endISO ? utcDay(new Date(endISO)) : null;
	const refDay = utcDay(ref);
	const effRef = cap && cap < refDay ? cap : ref;
	return renewalsDue(startISO, period, sinceISO, effRef);
}
