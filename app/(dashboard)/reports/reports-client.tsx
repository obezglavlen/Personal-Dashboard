"use client";

import { useCallback, useMemo, useState } from "react";
import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { convertToBase, formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useHistoricalRates } from "@/lib/hooks/use-historical-rates";
import { useResource } from "@/lib/hooks/use-resource";
import {
	customRange,
	isInRange,
	presetRange,
	RANGE_PRESETS,
	type RangeKey,
} from "@/lib/reports/range";
import { IncomeExpenseChart } from "../income-expense-chart";
import type { Subscription } from "../subscriptions/subscription-client";

type TaxRecord = {
	id: string;
	date: string;
	amount: number | null;
	currency: string | null;
};

type Income = {
	id: string;
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

const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

const TOOLTIP_STYLE = {
	background: "var(--popover)",
	color: "var(--popover-foreground)",
	border: "1px solid var(--border)",
	borderRadius: 8,
	fontSize: 12,
	padding: "8px 12px",
} as const;

/** Monthly-equivalent price of a subscription (annual amortized over 12). */
function perMonth(s: Subscription): number {
	return s.period === "annual" ? s.price / 12 : s.price;
}

export function ReportsClient() {
	const { items: records } = useResource<TaxRecord>("/api/tax-records");
	const { items: incomeItems } = useResource<Income>("/api/income");
	const { items: expenses } = useResource<Expense>("/api/expenses");
	const { items: subs } = useResource<Subscription>("/api/subscriptions");
	const { currency } = useCurrency();
	const { ratesForDate } = useHistoricalRates(currency);

	const [rangeKey, setRangeKey] = useState<RangeKey | "custom">("this-month");
	const [customFrom, setCustomFrom] = useState("");
	const [customTo, setCustomTo] = useState("");

	// Resolve the active range; a custom range falls back to this-month until
	// both dates are valid.
	const range = useMemo(() => {
		if (rangeKey === "custom") {
			// Incomplete/inverted custom dates → an empty range (start === end
			// matches nothing) so the shown figures agree with the "Custom (pick
			// dates)" label rather than silently displaying this-month totals.
			return (
				customRange(customFrom, customTo) ?? {
					start: new Date(0),
					end: new Date(0),
				}
			);
		}
		return presetRange(rangeKey);
	}, [rangeKey, customFrom, customTo]);

	const rangeLabel =
		rangeKey === "custom"
			? customRange(customFrom, customTo)
				? `${customFrom} → ${customTo}`
				: "Custom (pick dates)"
			: (RANGE_PRESETS.find((p) => p.key === rangeKey)?.label ?? "");

	// Convert an amount to the display currency at the rate for its own date, so
	// historical rows use then-current rates rather than today's.
	const toBase = useCallback(
		(amount: number, from: string, isoDate: string) =>
			convertToBase(amount, from, currency, ratesForDate(isoDate)),
		[currency, ratesForDate],
	);

	// Income / expense / net over the selected range, in the global currency.
	const summary = useMemo(() => {
		let income = 0;
		let expense = 0;
		for (const r of incomeItems) {
			if (r.amount == null || !isInRange(r.date, range)) continue;
			income += toBase(r.amount, r.currency ?? currency, r.date);
		}
		for (const r of records) {
			if (r.amount == null || !isInRange(r.date, range)) continue;
			expense += toBase(r.amount, r.currency ?? currency, r.date);
		}
		for (const e of expenses) {
			if (isInRange(e.date, range)) {
				expense += toBase(e.amount, e.currency, e.date);
			}
		}
		return { income, expense, net: income - expense };
	}, [records, incomeItems, expenses, toBase, currency, range]);

	// Expense total over the range, grouped by first tag (primary category).
	const byCategory = useMemo(() => {
		const map = new Map<string, number>();
		for (const e of expenses) {
			if (!isInRange(e.date, range)) continue;
			const cat = e.tags[0] ?? "Untagged";
			map.set(cat, (map.get(cat) ?? 0) + toBase(e.amount, e.currency, e.date));
		}
		return [...map.entries()]
			.map(([name, value]) => ({ name, value }))
			.sort((a, b) => b.value - a.value);
	}, [expenses, toBase, range]);

	// Subscription monthly cost grouped by category.
	const subsByCategory = useMemo(() => {
		const map = new Map<string, number>();
		// Subscriptions are an ongoing monthly cost — value them at today's rate.
		const todayIso = new Date().toISOString();
		for (const s of subs) {
			const cat = s.tags[0]?.trim() || "Uncategorized";
			map.set(
				cat,
				(map.get(cat) ?? 0) + toBase(perMonth(s), s.currency, todayIso),
			);
		}
		return [...map.entries()]
			.map(([name, value]) => ({ name, value }))
			.sort((a, b) => b.value - a.value);
	}, [subs, toBase]);

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
					Reports
				</h1>
				<p className="text-sm text-muted-foreground sm:text-base">
					Spending and income analytics · {rangeLabel}. Amounts in {currency}.
				</p>
			</div>

			{/* Range selector */}
			<div className="flex flex-wrap items-center gap-2">
				{RANGE_PRESETS.map((p) => (
					<Button
						key={p.key}
						variant={rangeKey === p.key ? "default" : "outline"}
						size="sm"
						onClick={() => setRangeKey(p.key)}
					>
						{p.label}
					</Button>
				))}
				<Button
					variant={rangeKey === "custom" ? "default" : "outline"}
					size="sm"
					onClick={() => setRangeKey("custom")}
				>
					Custom
				</Button>
				{rangeKey === "custom" && (
					<div className="flex items-center gap-2">
						<Input
							type="date"
							value={customFrom}
							onChange={(e) => setCustomFrom(e.target.value)}
							className="w-auto"
							aria-label="From date"
						/>
						<span className="text-sm text-muted-foreground">→</span>
						<Input
							type="date"
							value={customTo}
							onChange={(e) => setCustomTo(e.target.value)}
							className="w-auto"
							aria-label="To date"
						/>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
				<SummaryCard label="Income" value={summary.income} currency={currency} />
				<SummaryCard label="Expense" value={summary.expense} currency={currency} />
				<SummaryCard
					label="Net"
					value={summary.net}
					currency={currency}
					tone={summary.net >= 0 ? "positive" : "negative"}
				/>
			</div>

			<IncomeExpenseChart />

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
				<CategoryPie
					title="Expenses by category"
					description={`Grouped by primary tag · ${rangeLabel}`}
					data={byCategory}
					currency={currency}
				/>
				<CategoryPie
					title="Subscriptions by category"
					description="Monthly-equivalent cost"
					data={subsByCategory}
					currency={currency}
				/>
			</div>
		</div>
	);
}

function SummaryCard({
	label,
	value,
	currency,
	tone,
}: {
	label: string;
	value: number;
	currency: string;
	tone?: "positive" | "negative";
}) {
	const color =
		tone === "positive"
			? "text-green-600 dark:text-green-500"
			: tone === "negative"
				? "text-destructive"
				: "";
	return (
		<Card>
			<CardContent className="pt-6">
				<p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
				<p className={`text-2xl font-bold tabular-nums sm:text-3xl ${color}`}>
					{formatMoney(value, currency)}
				</p>
			</CardContent>
		</Card>
	);
}

function CategoryPie({
	title,
	description,
	data,
	currency,
}: {
	title: string;
	description: string;
	data: { name: string; value: number }[];
	currency: string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<p className="py-12 text-center text-sm text-muted-foreground">
						No data yet.
					</p>
				) : (
					<div className="h-72 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={data}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius="80%"
									label={(e) => e.name}
									labelLine={false}
								>
									{data.map((entry, i) => (
										<Cell
											key={entry.name}
											fill={CHART_COLORS[i % CHART_COLORS.length]}
										/>
									))}
								</Pie>
								<Tooltip
									formatter={(v) => formatMoney(Number(v), currency)}
									contentStyle={TOOLTIP_STYLE}
									itemStyle={{ color: "var(--popover-foreground)" }}
								/>
								<Legend wrapperStyle={{ fontSize: 12 }} />
							</PieChart>
						</ResponsiveContainer>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
