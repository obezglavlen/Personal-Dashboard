"use client";

import { useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
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
import { formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useHistoricalRates } from "@/lib/hooks/use-historical-rates";
import { useResource } from "@/lib/hooks/use-resource";
import { netWorthInBase } from "@/lib/net-worth/snapshot-math";

type Snapshot = { date: string; byCurrency: Record<string, number> };

const RANGES = [
	{ label: "1M", days: 30 },
	{ label: "3M", days: 90 },
	{ label: "1Y", days: 365 },
	{ label: "All", days: 0 },
];

const MONTHS = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function label(iso: string, longRange: boolean): string {
	const d = new Date(iso);
	return longRange
		? `${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`
		: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Net worth over time, each day converted at that day's exchange rate. */
export function NetWorthTrend() {
	const { items } = useResource<Snapshot>("/api/net-worth-snapshots");
	const { currency } = useCurrency();
	const { ratesForDate } = useHistoricalRates(currency);
	const [rangeIdx, setRangeIdx] = useState(2); // default 1Y
	const range = RANGES[rangeIdx];

	const data = useMemo(() => {
		const longRange = range.days === 0 || range.days > 90;
		// Anchor the cutoff to UTC midnight (snapshot dates are day-granular at
		// T00:00Z); a wall-clock Date.now() would drop the oldest expected day for
		// most of the day. `days - 1` keeps exactly `days` calendar days inclusive.
		const now = new Date();
		const todayUTC = Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate(),
		);
		const cutoff = range.days ? todayUTC - (range.days - 1) * 86_400_000 : 0;
		return items
			.filter((s) => range.days === 0 || new Date(s.date).getTime() >= cutoff)
			.map((s) => ({
				label: label(s.date, longRange),
				value: netWorthInBase(s.byCurrency, currency, ratesForDate(s.date)),
			}));
	}, [items, range, currency, ratesForDate]);

	return (
		<Card>
			<CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<CardTitle>Net worth over time</CardTitle>
					<CardDescription>
						Daily snapshots, valued at each day's rate ({currency})
					</CardDescription>
				</div>
				<div className="flex flex-wrap gap-1">
					{RANGES.map((r, i) => (
						<Button
							key={r.label}
							variant={rangeIdx === i ? "default" : "outline"}
							size="sm"
							onClick={() => setRangeIdx(i)}
						>
							{r.label}
						</Button>
					))}
				</div>
			</CardHeader>
			<CardContent>
				{data.length < 2 ? (
					<p className="py-12 text-center text-sm text-muted-foreground">
						Not enough history yet — a snapshot is recorded each day, so the
						trend fills in over the coming days.
					</p>
				) : (
					<div className="h-72 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={data}
								margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
							>
								<defs>
									<linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
										<stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
								<XAxis
									dataKey="label"
									tick={{ fontSize: 12 }}
									interval="preserveStartEnd"
									minTickGap={24}
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
									}}
									labelStyle={{
										color: "var(--popover-foreground)",
										fontWeight: 600,
										marginBottom: 4,
									}}
									itemStyle={{ color: "var(--popover-foreground)", padding: 0 }}
								/>
								<Area
									type="monotone"
									dataKey="value"
									name="Net worth"
									stroke="var(--chart-1)"
									strokeWidth={2}
									fill="url(#nw-fill)"
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
