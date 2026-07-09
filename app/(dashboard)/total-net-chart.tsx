"use client";

import { useCallback, useMemo, useState } from "react";
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
import { convertToBase, formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useHistoricalRates } from "@/lib/hooks/use-historical-rates";
import { useResource } from "@/lib/hooks/use-resource";
import { type CumulativeEntry, cumulativeNet } from "@/lib/reports/cumulative-net";

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

// Same period presets and default (1Y) as the Income vs Expense chart, so the
// two time-series share one mental model. Day-unit periods bucket by day.
const PERIODS: { label: string; unit: "day" | "month"; count: number }[] = [
	{ label: "7D", unit: "day", count: 7 },
	{ label: "1M", unit: "day", count: 30 },
	{ label: "3M", unit: "month", count: 3 },
	{ label: "6M", unit: "month", count: 6 },
	{ label: "1Y", unit: "month", count: 12 },
	{ label: "2Y", unit: "month", count: 24 },
	{ label: "6Y", unit: "month", count: 72 },
];

export function TotalNetChart() {
	const { items: records } = useResource<TaxRecord>("/api/tax-records");
	const { items: income } = useResource<Income>("/api/income");
	const { items: expenses } = useResource<Expense>("/api/expenses");
	const { currency } = useCurrency();
	const { ratesForDate } = useHistoricalRates(currency);
	// Default to 1Y (index into PERIODS).
	const [periodIdx, setPeriodIdx] = useState(4);
	const period = PERIODS[periodIdx];

	// Convert an amount to the display currency at the rate for its own date.
	const toBase = useCallback(
		(amount: number, from: string, iso: string) =>
			convertToBase(amount, from, currency, ratesForDate(iso)),
		[currency, ratesForDate],
	);

	const data = useMemo(() => {
		const incomeRows: CumulativeEntry[] = (income ?? [])
			.filter((r) => r.amount != null)
			.map((r) => ({
				date: r.date,
				amount: r.amount as number,
				currency: r.currency ?? currency,
			}));
		// Expenses = tax records + standalone expenses (matches the Net summary
		// card and the Income vs Expense chart).
		const expenseRows: CumulativeEntry[] = [
			...(records ?? [])
				.filter((r) => r.amount != null)
				.map((r) => ({
					date: r.date,
					amount: r.amount as number,
					currency: r.currency ?? currency,
				})),
			...(expenses ?? []).map((e) => ({
				date: e.date,
				amount: e.amount,
				currency: e.currency,
			})),
		];
		return cumulativeNet({
			now: new Date(),
			unit: period.unit,
			count: period.count,
			income: incomeRows,
			expense: expenseRows,
			convert: toBase,
		});
	}, [income, records, expenses, period, currency, toBase]);

	// Cumulative means the last point holds the grand total; if it is all zero,
	// the whole window is empty.
	const last = data.at(-1);
	const hasData = !!last && (last.income !== 0 || last.expense !== 0);

	return (
		<Card>
			<CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<CardTitle>Total net</CardTitle>
					<CardDescription>
						Cumulative income vs expenses over the selected period ({currency})
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
				{!hasData ? (
					<p className="py-12 text-center text-sm text-muted-foreground">
						No income or expenses in this period yet.
					</p>
				) : (
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
									type="monotone"
									dataKey="income"
									name="Income (cumulative)"
									stroke="#22c55e"
									strokeWidth={2}
									dot={false}
								/>
								<Line
									type="monotone"
									dataKey="expense"
									name="Expenses (cumulative)"
									stroke="#ef4444"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
