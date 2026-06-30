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

type Account = { id: string; balance: number; currency: string };
type Goal = { id: string; name: string; target: number; current: number };

/** Dashboard widget: total net worth + top savings goals. */
export function NetWorthWidget() {
	const { items: accounts } = useResource<Account>("/api/accounts");
	const { items: goals } = useResource<Goal>("/api/goals");
	const { currency } = useCurrency();
	const { rates } = useRates(currency);

	const net = useMemo(
		() =>
			accounts.reduce(
				(s, a) => s + convertToBase(a.balance, a.currency, currency, rates),
				0,
			),
		[accounts, currency, rates],
	);

	const topGoals = goals.slice(0, 3);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>Net Worth</CardTitle>
					<CardDescription>Across {accounts.length} accounts</CardDescription>
				</div>
				<Link
					href="/net-worth"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					View all <ArrowRight className="h-3 w-3" />
				</Link>
			</CardHeader>
			<CardContent className="space-y-4">
				{accounts.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No accounts yet.{" "}
						<Link href="/net-worth" className="underline hover:text-foreground">
							Add one
						</Link>
						.
					</p>
				) : (
					<p
						className={`text-3xl font-bold tabular-nums ${net < 0 ? "text-destructive" : ""}`}
					>
						{formatMoney(net, currency)}
					</p>
				)}

				{topGoals.length > 0 && (
					<ul className="space-y-2">
						{topGoals.map((g) => {
							const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
							const done = g.current >= g.target;
							return (
								<li key={g.id} className="space-y-1">
									<div className="flex items-center justify-between text-xs">
										<span className="truncate font-medium">{g.name}</span>
										<span className="text-muted-foreground tabular-nums">
											{Math.round(pct)}%
										</span>
									</div>
									<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<div
											className={`h-full rounded-full ${done ? "bg-green-600 dark:bg-green-500" : "bg-primary"}`}
											style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
										/>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
