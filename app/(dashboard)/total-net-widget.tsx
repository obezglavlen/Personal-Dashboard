"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
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

type Income = { id: string; amount: number | null; currency: string };
type TaxRecord = { id: string; amount: number | null; currency: string };
type Expense = { id: string; amount: number; currency: string };

/**
 * Dashboard widget: all-time total net = cumulative income − expenses, where
 * "expenses" is standalone expenses + tax records (the same definition the
 * Reports "Total net" chart uses). Distinct from Net Worth, which sums current
 * account balances. Converted to the display currency at today's rate.
 */
export function TotalNetWidget() {
	const { items: income } = useResource<Income>("/api/income");
	const { items: taxRecords } = useResource<TaxRecord>("/api/tax-records");
	const { items: expenses } = useResource<Expense>("/api/expenses");
	const { currency } = useCurrency();
	const { rates } = useRates(currency);

	const { totalIncome, totalExpense, net } = useMemo(() => {
		const totalIncome = income.reduce(
			(s, r) => s + convertToBase(r.amount ?? 0, r.currency, currency, rates),
			0,
		);
		const totalExpense =
			taxRecords.reduce(
				(s, r) => s + convertToBase(r.amount ?? 0, r.currency, currency, rates),
				0,
			) +
			expenses.reduce(
				(s, e) => s + convertToBase(e.amount, e.currency, currency, rates),
				0,
			);
		return { totalIncome, totalExpense, net: totalIncome - totalExpense };
	}, [income, taxRecords, expenses, currency, rates]);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>Total Net</CardTitle>
					<CardDescription>Cumulative income minus expenses</CardDescription>
				</div>
				<Link
					href="/reports"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					View report <ArrowRight className="h-3 w-3" />
				</Link>
			</CardHeader>
			<CardContent className="space-y-4">
				<p
					className={`text-3xl font-bold tabular-nums ${net < 0 ? "text-destructive" : ""}`}
				>
					{formatMoney(net, currency)}
				</p>
				<dl className="grid grid-cols-2 gap-3">
					<div className="rounded-md border border-border p-3">
						<dt className="text-xs text-muted-foreground">Income</dt>
						<dd className="text-sm font-medium tabular-nums text-green-600 dark:text-green-500">
							{formatMoney(totalIncome, currency)}
						</dd>
					</div>
					<div className="rounded-md border border-border p-3">
						<dt className="text-xs text-muted-foreground">Expenses</dt>
						<dd className="text-sm font-medium tabular-nums text-destructive">
							{formatMoney(totalExpense, currency)}
						</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	);
}
