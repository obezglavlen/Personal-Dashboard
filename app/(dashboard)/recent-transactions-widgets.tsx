"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { useResource } from "@/lib/hooks/use-resource";

type Row = {
	id: string;
	amount: number | null;
	currency: string;
	date: string;
};

/** Short, locale-aware date (client-only render, so no SSR hydration mismatch). */
function fmtDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

/**
 * Shared list body for the "last N" money widgets. Fetches a user-scoped
 * collection (already returned date-desc by the API), takes the newest `limit`,
 * and renders each as a labelled amount. `labelOf` derives the row's primary
 * text; `emptyLink` is the CTA shown when there is nothing yet.
 */
function RecentTransactions<T extends Row>({
	title,
	description,
	href,
	path,
	labelOf,
	emptyText,
	limit = 5,
}: {
	title: string;
	description: string;
	href: string;
	path: string;
	labelOf: (row: T) => string;
	emptyText: ReactNode;
	limit?: number;
}) {
	const { items } = useResource<T>(path);
	const rows = items.slice(0, limit);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
				<Link
					href={href}
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					View all <ArrowRight className="h-3 w-3" />
				</Link>
			</CardHeader>
			<CardContent>
				{rows.length === 0 ? (
					<p className="text-sm text-muted-foreground">{emptyText}</p>
				) : (
					<ul className="space-y-2">
						{rows.map((row) => (
							<li
								key={row.id}
								className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
							>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">{labelOf(row)}</p>
									<p className="text-xs text-muted-foreground">
										{fmtDate(row.date)}
									</p>
								</div>
								<span className="shrink-0 text-sm font-medium tabular-nums">
									{row.amount != null
										? formatMoney(row.amount, row.currency)
										: "—"}
								</span>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

type Expense = Row & { name: string };
type Income = Row & { description: string | null; taxConfigName: string | null };
type TaxRecord = Row & {
	description: string | null;
	taxConfigName: string | null;
};

export function LastExpensesWidget() {
	return (
		<RecentTransactions<Expense>
			title="Last Expenses"
			description="Your most recent spending"
			href="/expenses"
			path="/api/expenses"
			labelOf={(e) => e.name}
			emptyText={
				<>
					No expenses yet.{" "}
					<Link href="/expenses" className="underline hover:text-foreground">
						Add one
					</Link>
					.
				</>
			}
		/>
	);
}

export function LastIncomeWidget() {
	return (
		<RecentTransactions<Income>
			title="Last Income"
			description="Your most recent income"
			href="/income"
			path="/api/income"
			labelOf={(r) => r.description || r.taxConfigName || "Income"}
			emptyText={
				<>
					No income yet.{" "}
					<Link href="/income" className="underline hover:text-foreground">
						Add one
					</Link>
					.
				</>
			}
		/>
	);
}

export function LastTaxesWidget() {
	return (
		<RecentTransactions<TaxRecord>
			title="Last Taxes"
			description="Your most recent tax records"
			href="/taxes"
			path="/api/tax-records"
			labelOf={(r) => r.description || r.taxConfigName || "Tax"}
			emptyText={
				<>
					No tax records yet.{" "}
					<Link href="/taxes" className="underline hover:text-foreground">
						Add one
					</Link>
					.
				</>
			}
		/>
	);
}
