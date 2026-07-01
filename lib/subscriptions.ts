/**
 * Subscription renewal helpers. The core recurrence math now lives in
 * `lib/recurring-dates` (shared with generic recurring transactions) and is
 * re-exported here so existing subscription callers keep working unchanged.
 */

import {
	daysUntil,
	nextRenewal,
	type Period,
	renewalsDue,
} from "./recurring-dates";

export {
	daysUntil,
	nextRenewal,
	type Period,
	renewalsDue,
} from "./recurring-dates";

interface RenewableLike {
	name: string;
	price: number;
	period: Period;
	startDate: string;
	currency: string;
	category?: string | null;
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
