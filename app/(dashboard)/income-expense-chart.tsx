"use client";

import { useMemo, useState } from "react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { TagInput } from "@/components/ui/tag-input";
import { bucketKey, bucketLabel, projectForecast } from "@/lib/forecast";
import { convertToBase, formatMoney } from "@/lib/format";
import { useAllTags } from "@/lib/hooks/use-all-tags";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useHistoricalRates } from "@/lib/hooks/use-historical-rates";
import { useResource } from "@/lib/hooks/use-resource";
import type { Period } from "@/lib/recurring-dates";

type TaxRecord = {
	id: string;
	type: "income" | "expense" | "declaration_sent" | "declaration_todo";
	date: string;
	amount: number | null;
	currency: string | null;
};

type Expense = {
	id: string;
	amount: number;
	currency: string;
	date: string;
	tags: string[];
};

type Subscription = {
	id: string;
	price: number;
	period: Period;
	startDate: string;
	currency: string;
};

type Recurring = {
	id: string;
	amount: number;
	type: "income" | "expense";
	period: Period;
	startDate: string;
	endDate: string | null;
	currency: string;
};

type Bucket = {
	key: string;
	label: string;
	income: number | null;
	expense: number | null;
	incomeF: number | null;
	expenseF: number | null;
};

// Implicit tag applied to tax-type expense records in the dashboard filter.
const TAX_TAG = "taxes";
// Trailing months averaged to estimate future monthly tax in the forecast.
const TAX_LOOKBACK_MONTHS = 6;

// Day-unit periods bucket by day; month-unit periods bucket by month.
const PERIODS: { label: string; unit: "day" | "month"; count: number }[] = [
	{ label: "7D", unit: "day", count: 7 },
	{ label: "1M", unit: "day", count: 30 },
	{ label: "3M", unit: "month", count: 3 },
	{ label: "6M", unit: "month", count: 6 },
	{ label: "1Y", unit: "month", count: 12 },
	{ label: "2Y", unit: "month", count: 24 },
	{ label: "6Y", unit: "month", count: 72 },
];

export function IncomeExpenseChart() {
	const { items: records } = useResource<TaxRecord>("/api/tax-records");
	const { items: expenses } = useResource<Expense>("/api/expenses");
	const { items: subs } = useResource<Subscription>("/api/subscriptions");
	const { items: recurring } = useResource<Recurring>("/api/recurring");
	const { currency } = useCurrency();
	const { ratesForDate } = useHistoricalRates(currency);
	// Default to 1Y (index into PERIODS).
	const [periodIdx, setPeriodIdx] = useState(4);
	const period = PERIODS[periodIdx];
	const [tagFilter, setTagFilter] = useState<string[]>([]);

	// Distinct tags across expenses, for the search-bar autocomplete. Tax
	// records of type "expense" have no tags of their own, so they carry an
	// implicit TAX_TAG ("taxes") that participates in filtering like any other.
	const catalog = useAllTags();
	const allTags = useMemo(() => {
		const set = new Set(catalog);
		if ((records ?? []).some((r) => r.type === "expense" && r.amount != null)) {
			set.add(TAX_TAG);
		}
		return [...set].sort((a, b) => a.localeCompare(b));
	}, [catalog, records]);

	const data = useMemo<Bucket[]>(() => {
		// Build contiguous historical buckets ending at the current day/month so
		// empty periods still render as gaps rather than collapsing. Day-unit
		// periods bucket by calendar day; month-unit periods by month.
		const now = new Date();
		const byDay = period.unit === "day";
		const multiYear = !byDay && period.count > 12;
		const buckets: Bucket[] = [];
		const index = new Map<string, number>();

		for (let i = period.count - 1; i >= 0; i--) {
			const d = byDay
				? new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
				: new Date(now.getFullYear(), now.getMonth() - i, 1);
			index.set(bucketKey(d, byDay), buckets.length);
			buckets.push({
				key: bucketKey(d, byDay),
				label: bucketLabel(d, byDay, multiYear),
				income: 0,
				expense: 0,
				incomeF: null,
				expenseF: null,
			});
		}

		const selected = new Set(tagFilter.map((t) => t.toLowerCase()));
		const toBase = (amount: number, from: string, iso: string) =>
			convertToBase(amount, from, currency, ratesForDate(iso));

		// Tax records: income is never tag-filtered; expense carries the implicit
		// TAX_TAG so a tag filter only counts it when "taxes" is selected.
		for (const r of records ?? []) {
			if (r.amount == null) continue;
			if (r.type !== "income" && r.type !== "expense") continue;
			if (r.type === "expense" && selected.size > 0 && !selected.has(TAX_TAG)) {
				continue;
			}
			const slot = index.get(bucketKey(new Date(r.date), byDay));
			if (slot == null) continue;
			// Non-forecast buckets always start numeric, never null.
			buckets[slot][r.type]! += toBase(r.amount, r.currency ?? currency, r.date);
		}

		// Standalone expenses, filtered by selected tags (any-match; none ⇒ all).
		for (const e of expenses ?? []) {
			if (
				selected.size > 0 &&
				!e.tags.some((t) => selected.has(t.toLowerCase()))
			) {
				continue;
			}
			const slot = index.get(bucketKey(new Date(e.date), byDay));
			if (slot == null) continue;
			buckets[slot].expense! += toBase(e.amount, e.currency, e.date);
		}

		// Estimate the recurring monthly tax expense from the trailing months, so
		// the forecast can repeat it forward (there is no recurring-tax model).
		const taxFrom = new Date(
			now.getFullYear(),
			now.getMonth() - TAX_LOOKBACK_MONTHS,
			now.getDate(),
		);
		let taxSum = 0;
		for (const r of records ?? []) {
			if (r.type !== "expense" || r.amount == null) continue;
			const d = new Date(r.date);
			if (d < taxFrom || d > now) continue;
			taxSum += toBase(r.amount, r.currency ?? currency, r.date);
		}
		const monthlyTaxAvg = taxSum / TAX_LOOKBACK_MONTHS;

		// Bridge: seed the forecast series at the last historical point so the
		// dashed line connects to the solid line with no gap.
		const last = buckets[buckets.length - 1];
		if (last) {
			last.incomeF = last.income;
			last.expenseF = last.expense;
		}

		// Append the forward projection as dashed-only buckets.
		const forecast = projectForecast({
			now,
			unit: period.unit,
			multiYear,
			subscriptions: subs ?? [],
			recurring: recurring ?? [],
			monthlyTaxAvg,
			convert: toBase,
		});
		for (const f of forecast) {
			buckets.push({
				key: f.key,
				label: f.label,
				income: null,
				expense: null,
				incomeF: f.income,
				expenseF: f.expense,
			});
		}

		return buckets;
	}, [records, expenses, subs, recurring, period, tagFilter, currency, ratesForDate]);

	return (
		<Card>
			<CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<CardTitle>Income vs Expense</CardTitle>
					<CardDescription>
						{period.unit === "day" ? "Daily" : "Monthly"} totals over the
						selected period, with a dashed{" "}
						{period.unit === "day" ? "+14d" : "+3mo"} estimate ({currency})
					</CardDescription>
				</div>
				<div className="flex flex-wrap gap-1">
					{PERIODS.map((p, i) => (
						<Button
							key={p.label}
							variant={periodIdx === i ? "default" : "outline"}
							size="sm"
							onClick={() => setPeriodIdx(i)}
						>
							{p.label}
						</Button>
					))}
				</div>
			</CardHeader>
			<CardContent>
				<div className="mb-4">
					<TagInput
						value={tagFilter}
						onChange={setTagFilter}
						suggestions={allTags}
						allowCreate={false}
						placeholder="Filter expenses by tag…"
					/>
				</div>
				<div className="h-72 w-full">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={data}
							margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
						>
							<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
							<XAxis
								dataKey="label"
								tick={{ fontSize: 12 }}
								interval="preserveStartEnd"
								minTickGap={16}
							/>
							<YAxis tick={{ fontSize: 12 }} width={56} />
							<Tooltip
								formatter={(v) => formatMoney(Number(v), currency)}
								cursor={{ stroke: "var(--foreground)", strokeOpacity: 0.2 }}
								contentStyle={{
									background: "var(--popover)",
									color: "var(--popover-foreground)",
									border: "1px solid var(--border)",
									borderRadius: 8,
									fontSize: 12,
									padding: "8px 12px",
									boxShadow:
										"0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
								}}
								labelStyle={{
									color: "var(--popover-foreground)",
									fontWeight: 600,
									marginBottom: 4,
								}}
								itemStyle={{ color: "var(--popover-foreground)", padding: 0 }}
							/>
							<Legend wrapperStyle={{ fontSize: 12 }} />
							<Line
								dataKey="income"
								name="Income"
								stroke="#22c55e"
								strokeWidth={2}
								dot={false}
								connectNulls
							/>
							<Line
								dataKey="expense"
								name="Expense"
								stroke="#ef4444"
								strokeWidth={2}
								dot={false}
								connectNulls
							/>
							<Line
								dataKey="incomeF"
								name="Income (est.)"
								stroke="#22c55e"
								strokeWidth={2}
								strokeDasharray="5 5"
								dot={false}
								connectNulls
							/>
							<Line
								dataKey="expenseF"
								name="Expense (est.)"
								stroke="#ef4444"
								strokeWidth={2}
								strokeDasharray="5 5"
								dot={false}
								connectNulls
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}
