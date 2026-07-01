"use client";

import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
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
import { convertToBase, formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useHistoricalRates } from "@/lib/hooks/use-historical-rates";
import { useResource } from "@/lib/hooks/use-resource";

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

// Implicit tag applied to tax-type expense records in the dashboard filter.
const TAX_TAG = "taxes";

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

const MONTHS = [
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

export function IncomeExpenseChart() {
	const { items: records } = useResource<TaxRecord>("/api/tax-records");
	const { items: expenses } = useResource<Expense>("/api/expenses");
	const { currency } = useCurrency();
	const { ratesForDate } = useHistoricalRates(currency);
	// Default to 1Y (index into PERIODS).
	const [periodIdx, setPeriodIdx] = useState(4);
	const period = PERIODS[periodIdx];
	const [tagFilter, setTagFilter] = useState<string[]>([]);

	// Distinct tags across expenses, for the search-bar autocomplete. Tax
	// records of type "expense" have no tags of their own, so they carry an
	// implicit TAX_TAG ("taxes") that participates in filtering like any other.
	const allTags = useMemo(() => {
		const set = new Map<string, string>();
		for (const e of expenses ?? []) {
			for (const t of e.tags) {
				const k = t.toLowerCase();
				if (!set.has(k)) set.set(k, t);
			}
		}
		if ((records ?? []).some((r) => r.type === "expense" && r.amount != null)) {
			set.set(TAX_TAG, TAX_TAG);
		}
		return [...set.values()].sort((a, b) => a.localeCompare(b));
	}, [expenses, records]);

	const data = useMemo(() => {
		// Build contiguous buckets ending at the current day/month so empty
		// periods still render as gaps rather than collapsing. Day-unit periods
		// bucket by calendar day; month-unit periods by month.
		const now = new Date();
		const byDay = period.unit === "day";
		const multiYear = !byDay && period.count > 12;
		const buckets: {
			key: string;
			label: string;
			income: number;
			expense: number;
		}[] = [];
		const index = new Map<string, number>();

		// Bucket key for a date, matching the active period's unit.
		const keyOf = (d: Date) =>
			byDay
				? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
				: `${d.getFullYear()}-${d.getMonth()}`;

		for (let i = period.count - 1; i >= 0; i--) {
			const d = byDay
				? new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
				: new Date(now.getFullYear(), now.getMonth() - i, 1);
			const label = byDay
				? `${MONTHS[d.getMonth()]} ${d.getDate()}`
				: multiYear
					? `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
					: MONTHS[d.getMonth()];
			index.set(keyOf(d), buckets.length);
			buckets.push({ key: keyOf(d), label, income: 0, expense: 0 });
		}

		const selected = new Set(tagFilter.map((t) => t.toLowerCase()));

		// Tax records: income is never tag-filtered; expense carries the implicit
		// TAX_TAG so a tag filter only counts it when "taxes" is selected.
		for (const r of records ?? []) {
			if (r.amount == null) continue;
			if (r.type !== "income" && r.type !== "expense") continue;
			if (r.type === "expense" && selected.size > 0 && !selected.has(TAX_TAG)) {
				continue;
			}
			const slot = index.get(keyOf(new Date(r.date)));
			if (slot == null) continue;
			buckets[slot][r.type] += convertToBase(
				r.amount,
				r.currency ?? currency,
				currency,
				ratesForDate(r.date),
			);
		}

		// Standalone expenses, filtered by selected tags (any-match; none ⇒ all).
		for (const e of expenses ?? []) {
			if (
				selected.size > 0 &&
				!e.tags.some((t) => selected.has(t.toLowerCase()))
			) {
				continue;
			}
			const slot = index.get(keyOf(new Date(e.date)));
			if (slot == null) continue;
			buckets[slot].expense += convertToBase(
				e.amount,
				e.currency,
				currency,
				ratesForDate(e.date),
			);
		}

		return buckets;
	}, [records, expenses, period, tagFilter, currency, ratesForDate]);

	return (
		<Card>
			<CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<CardTitle>Income vs Expense</CardTitle>
					<CardDescription>
						{period.unit === "day" ? "Daily" : "Monthly"} totals over the
						selected period ({currency})
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
						<BarChart
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
								cursor={{ fill: "var(--foreground)", fillOpacity: 0.06 }}
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
							<Bar
								dataKey="income"
								name="Income"
								fill="#22c55e"
								radius={[2, 2, 0, 0]}
							/>
							<Bar
								dataKey="expense"
								name="Expense"
								fill="#ef4444"
								radius={[2, 2, 0, 0]}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}
