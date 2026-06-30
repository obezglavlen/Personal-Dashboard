/**
 * Subscription renewal math. Subscriptions store a `startDate` and a `period`
 * (`monthly` | `annual`); the next charge is derived by stepping that period
 * forward from the start until it lands on or after today. No charge history is
 * stored — this is a pure projection used by the "Upcoming renewals" widget.
 */

export type Period = "monthly" | "annual";

interface RenewableLike {
	name: string;
	price: number;
	period: Period;
	startDate: string;
	currency: string;
	category?: string | null;
}

/** Date at UTC midnight for `d` (drops the time-of-day). */
function utcDay(d: Date): Date {
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
 * Next renewal date (UTC midnight) on or after `ref`. If the subscription's
 * start is in the future, the first charge is the start date itself.
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
 * All renewal dates (UTC midnight) from the subscription's start through `ref`,
 * excluding any on or before `sinceISO` (the last already-posted renewal). The
 * start date itself counts as the first charge. Used by auto-posting to find
 * which renewals still need an Expense row, idempotently.
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

export interface UpcomingRenewal<T extends RenewableLike> {
	sub: T;
	date: Date;
	days: number;
}

/**
 * Subscriptions renewing within `withinDays` of `ref`, soonest first.
 */
export function upcomingRenewals<T extends RenewableLike>(
	subs: T[],
	withinDays: number,
	ref: Date = new Date(),
): UpcomingRenewal<T>[] {
	return subs
		.map((sub) => {
			const date = nextRenewal(sub.startDate, sub.period, ref);
			return { sub, date, days: daysUntil(date, ref) };
		})
		.filter((r) => r.days >= 0 && r.days <= withinDays)
		.sort((a, b) => a.date.getTime() - b.date.getTime());
}
