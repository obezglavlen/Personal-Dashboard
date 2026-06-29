"use client";

import { useMemo } from "react";
import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { convertToBase, formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useRates } from "@/lib/hooks/use-rates";
import { useResource } from "@/lib/hooks/use-resource";
import { currentMonthRange } from "@/lib/budget";
import { IncomeExpenseChart } from "../income-expense-chart";
import type { Subscription } from "../subscriptions/subscription-client";

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
	const { items: expenses } = useResource<Expense>("/api/expenses");
	const { items: subs } = useResource<Subscription>("/api/subscriptions");
	const { currency } = useCurrency();
	const { rates } = useRates(currency);

	const toBase = useMemo(
		() => (amount: number, from: string) =>
			convertToBase(amount, from, currency, rates),
		[currency, rates],
	);

	// This-month income / expense / net, in the global currency.
	const summary = useMemo(() => {
		const { start, end } = currentMonthRange();
		const inRange = (iso: string) => {
			const d = new Date(iso);
			return d >= start && d < end;
		};
		let income = 0;
		let expense = 0;
		for (const r of records) {
			if (r.amount == null || !inRange(r.date)) continue;
			if (r.type === "income") income += toBase(r.amount, r.currency ?? currency);
			if (r.type === "expense")
				expense += toBase(r.amount, r.currency ?? currency);
		}
		for (const e of expenses) {
			if (inRange(e.date)) expense += toBase(e.amount, e.currency);
		}
		return { income, expense, net: income - expense };
	}, [records, expenses, toBase, currency]);

	// Expense total grouped by first tag (the expense's primary category).
	const byCategory = useMemo(() => {
		const map = new Map<string, number>();
		for (const e of expenses) {
			const cat = e.tags[0] ?? "Untagged";
			map.set(cat, (map.get(cat) ?? 0) + toBase(e.amount, e.currency));
		}
		return [...map.entries()]
			.map(([name, value]) => ({ name, value }))
			.sort((a, b) => b.value - a.value);
	}, [expenses, toBase]);

	// Subscription monthly cost grouped by category.
	const subsByCategory = useMemo(() => {
		const map = new Map<string, number>();
		for (const s of subs) {
			const cat = s.category?.trim() || "Uncategorized";
			map.set(cat, (map.get(cat) ?? 0) + toBase(perMonth(s), s.currency));
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
					Spending and income analytics. Amounts in {currency}.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
				<SummaryCard label="Income this month" value={summary.income} currency={currency} />
				<SummaryCard label="Expense this month" value={summary.expense} currency={currency} />
				<SummaryCard
					label="Net this month"
					value={summary.net}
					currency={currency}
					tone={summary.net >= 0 ? "positive" : "negative"}
				/>
			</div>

			<IncomeExpenseChart />

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
				<CategoryPie
					title="Expenses by category"
					description="All expenses, grouped by primary tag"
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
