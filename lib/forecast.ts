/**
 * Forward projection ("forecast") for the Income vs Expense chart. Pure and
 * side-effect-free (inject `now` for tests). The chart draws historical actuals
 * up to today, then a dashed continuation built here from recurring cash flows:
 *   - subscription renewals  → future expense
 *   - recurring transactions → future income or expense (by `type`)
 *   - taxes                  → a flat estimate repeated across the window
 *
 * Recurrence stepping is delegated to `lib/recurring-dates` — this module only
 * bins the resulting occurrences into future buckets and adds the tax estimate.
 */

import {
	type Period,
	recurringDueDates,
	renewalsDue,
} from "./recurring-dates";

export type ForecastUnit = "day" | "month";

export const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

/**
 * Bucket key for a date, matching the chart's period unit. Day-unit periods key
 * by calendar day, month-unit periods by month. Shared with the chart component
 * so historical and forecast buckets use one scheme.
 */
export function bucketKey(d: Date, byDay: boolean): string {
	return byDay
		? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
		: `${d.getFullYear()}-${d.getMonth()}`;
}

/** X-axis label for a bucket. `multiYear` appends a 2-digit year to month labels. */
export function bucketLabel(d: Date, byDay: boolean, multiYear: boolean): string {
	if (byDay) return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
	return multiYear
		? `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
		: MONTHS[d.getMonth()];
}

export interface ForecastSubscription {
	price: number;
	period: Period;
	startDate: string;
	currency: string;
}

export interface ForecastRecurring {
	amount: number;
	type: "income" | "expense";
	period: Period;
	startDate: string;
	endDate: string | null;
	currency: string;
}

export interface ForecastInput {
	/** "Now" — injected for tests. Forecast starts at the next unit after this. */
	now: Date;
	/** "day" → +14 daily buckets; "month" → +3 monthly buckets. */
	unit: ForecastUnit;
	/** Append a 2-digit year to month labels (for the multi-year periods). */
	multiYear?: boolean;
	subscriptions: ForecastSubscription[];
	recurring: ForecastRecurring[];
	/** Recent average monthly tax expense, already in base currency. */
	monthlyTaxAvg: number;
	/** Convert an amount from `from` to base currency at the occurrence's date. */
	convert: (amount: number, from: string, iso: string) => number;
}

export interface ForecastBucket {
	key: string;
	label: string;
	income: number;
	expense: number;
}

/** Horizon in whole units past today, keyed by unit. */
export const DAY_HORIZON = 14;
export const MONTH_HORIZON = 3;
/** Days in an average month, for prorating the monthly tax estimate onto days. */
const DAYS_PER_MONTH = 30;

/**
 * A renewal date from `recurring-dates` is a UTC-midnight instant. Rebuild it as
 * a local Date carrying the same calendar Y/M/D so its `bucketKey` lines up with
 * the now-derived bucket boundaries (which are built from local components).
 */
function occToLocal(occ: Date): Date {
	return new Date(occ.getUTCFullYear(), occ.getUTCMonth(), occ.getUTCDate());
}

/**
 * Forecast buckets ({@link ForecastBucket}), index 0 = the current period and
 * indexes 1…horizon = the future window. Every bucket counts only charges dated
 * strictly after today, so the current period holds just its not-yet-recorded
 * remainder — the chart stacks that on top of the recorded actual for the same
 * period, and draws the future buckets as estimate-only bars. Every projected
 * amount is converted to base currency.
 */
export function projectForecast(input: ForecastInput): ForecastBucket[] {
	const { now, unit, subscriptions, recurring, monthlyTaxAvg, convert } = input;
	const byDay = unit === "day";
	const multiYear = input.multiYear ?? false;
	const horizon = byDay ? DAY_HORIZON : MONTH_HORIZON;

	// Bucket skeleton from the current period (i = 0) through the horizon.
	const buckets: ForecastBucket[] = [];
	const index = new Map<string, number>();
	for (let i = 0; i <= horizon; i++) {
		const d = byDay
			? new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
			: new Date(now.getFullYear(), now.getMonth() + i, 1);
		const key = bucketKey(d, byDay);
		index.set(key, buckets.length);
		buckets.push({
			key,
			label: bucketLabel(d, byDay, multiYear),
			income: 0,
			expense: 0,
		});
	}

	// Expansion window: strictly after today (`sinceISO` excludes ≤ today via the
	// utcDay comparison in renewalsDue) through the end of the last bucket.
	const sinceISO = now.toISOString();
	const endRef = byDay
		? new Date(now.getFullYear(), now.getMonth(), now.getDate() + horizon)
		: new Date(now.getFullYear(), now.getMonth() + horizon + 1, 0);

	const add = (occ: Date, field: "income" | "expense", base: number) => {
		const slot = index.get(bucketKey(occToLocal(occ), byDay));
		if (slot == null) return;
		buckets[slot][field] += base;
	};

	for (const s of subscriptions) {
		for (const occ of renewalsDue(s.startDate, s.period, sinceISO, endRef)) {
			add(occ, "expense", convert(s.price, s.currency, occ.toISOString()));
		}
	}

	for (const r of recurring) {
		for (const occ of recurringDueDates(
			r.startDate,
			r.period,
			sinceISO,
			r.endDate,
			endRef,
		)) {
			add(occ, r.type, convert(r.amount, r.currency, occ.toISOString()));
		}
	}

	// Tax estimate: repeat the recent monthly average across FUTURE buckets only
	// (prorated per day for day-unit forecasts). Skip index 0 — the current
	// period's taxes are already partly recorded as actuals.
	if (monthlyTaxAvg > 0) {
		const perBucket = byDay ? monthlyTaxAvg / DAYS_PER_MONTH : monthlyTaxAvg;
		for (let k = 1; k < buckets.length; k++) buckets[k].expense += perBucket;
	}

	return buckets;
}
