"use client";

import { ArrowRight, CalendarClock } from "lucide-react";
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
import { upcomingRenewals } from "@/lib/subscriptions";
import type { Subscription } from "./subscriptions/subscription-client";

const WINDOW_DAYS = 30;

function whenLabel(days: number): string {
	if (days === 0) return "today";
	if (days === 1) return "tomorrow";
	return `in ${days} days`;
}

/**
 * Dashboard widget: subscriptions renewing in the next 30 days, soonest first.
 * Pure projection from each subscription's start date + period — no new data.
 */
export function RenewalsWidget() {
	const { items: subs } = useResource<Subscription>("/api/subscriptions");
	const { currency } = useCurrency();
	const { rates } = useRates(currency);

	const upcoming = useMemo(
		() => upcomingRenewals(subs, WINDOW_DAYS).slice(0, 6),
		[subs],
	);

	const total = useMemo(
		() =>
			upcoming.reduce(
				(sum, r) =>
					sum + convertToBase(r.sub.price, r.sub.currency, currency, rates),
				0,
			),
		[upcoming, currency, rates],
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>Upcoming Renewals</CardTitle>
					<CardDescription>
						{upcoming.length > 0
							? `${formatMoney(total, currency)} due in the next ${WINDOW_DAYS} days`
							: `Next ${WINDOW_DAYS} days`}
					</CardDescription>
				</div>
				<Link
					href="/subscriptions"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					View all <ArrowRight className="h-3 w-3" />
				</Link>
			</CardHeader>
			<CardContent>
				{upcoming.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No renewals in the next {WINDOW_DAYS} days.
					</p>
				) : (
					<ul className="space-y-2">
						{upcoming.map((r) => (
							<li
								key={r.sub.id}
								className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
							>
								<div className="flex min-w-0 items-center gap-3">
									<CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">{r.sub.name}</p>
										<p className="text-xs text-muted-foreground">
											{r.date.toISOString().slice(0, 10)} · {whenLabel(r.days)}
										</p>
									</div>
								</div>
								<span className="shrink-0 text-sm font-medium tabular-nums">
									{formatMoney(r.sub.price, r.sub.currency)}
								</span>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
