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
import { spentForBudget } from "@/lib/budget";
import { convertToBase, formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useRates } from "@/lib/hooks/use-rates";
import { useResource } from "@/lib/hooks/use-resource";
import type { Expense } from "./expenses/create-expense-dialog";
import type { Budget } from "./budgets/create-budget-dialog";

/**
 * Compact dashboard widget: this month's progress for up to four budgets.
 * Client-side so it shares the same currency/rates conversion as the Budgets
 * page; the dashboard grid renders it as a slot.
 */
export function BudgetWidget() {
	const { items: budgets } = useResource<Budget>("/api/budgets");
	const { items: expenses } = useResource<Expense>("/api/expenses");
	const { currency } = useCurrency();
	const { rates } = useRates(currency);

	const rows = useMemo(
		() =>
			budgets.slice(0, 4).map((b) => {
				const cap = convertToBase(b.amount, b.currency, currency, rates);
				const spent = spentForBudget(b, expenses, currency, rates);
				const pct = cap > 0 ? (spent / cap) * 100 : 0;
				return { budget: b, cap, spent, pct, over: spent > cap };
			}),
		[budgets, expenses, currency, rates],
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>Budgets</CardTitle>
					<CardDescription>This month&apos;s spending caps</CardDescription>
				</div>
				<Link
					href="/budgets"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					View all <ArrowRight className="h-3 w-3" />
				</Link>
			</CardHeader>
			<CardContent>
				{rows.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No budgets yet.{" "}
						<Link href="/budgets" className="underline hover:text-foreground">
							Create one
						</Link>
						.
					</p>
				) : (
					<ul className="space-y-3">
						{rows.map(({ budget: b, cap, spent, pct, over }) => (
							<li key={b.id} className="space-y-1.5">
								<div className="flex items-center justify-between text-sm">
									<span className="truncate font-medium">{b.name}</span>
									<span
										className={`tabular-nums ${over ? "font-semibold text-destructive" : "text-muted-foreground"}`}
									>
										{formatMoney(spent, currency)} / {formatMoney(cap, currency)}
									</span>
								</div>
								<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
									<div
										className={`h-full rounded-full transition-all ${over ? "bg-destructive" : "bg-primary"}`}
										style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
									/>
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
