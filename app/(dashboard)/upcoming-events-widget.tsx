"use client";

import { ArrowRight, CalendarDays, Repeat } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { fetcher } from "@/lib/api-client";
import { dayKey, fmtTime, relativeDay } from "@/lib/calendar/display";
import type { Occurrence } from "@/lib/calendar/expand";

/**
 * Dashboard widget: the next handful of calendar occurrences, soonest first.
 * Reads the expanded-occurrences endpoint (default window: now → +90 days) so
 * recurring events show their next instance.
 */
export function UpcomingEventsWidget() {
	const { data } = useSWR<Occurrence[]>("/api/calendar/occurrences", fetcher);
	const events = (data ?? []).slice(0, 5);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>Upcoming Events</CardTitle>
					<CardDescription>Events coming up</CardDescription>
				</div>
				<Link
					href="/calendar"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					View all <ArrowRight className="h-3 w-3" />
				</Link>
			</CardHeader>
			<CardContent>
				{events.length === 0 ? (
					<p className="text-sm text-muted-foreground">Nothing scheduled soon.</p>
				) : (
					<ul className="space-y-2">
						{events.map((o) => (
							<li
								key={o.key}
								className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
							>
								<div className="flex min-w-0 items-center gap-3">
									<CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">{o.title}</p>
										<p className="text-xs text-muted-foreground">
											{relativeDay(dayKey(o.start, o.allDay))}
											{o.allDay ? "" : ` · ${fmtTime(o.start)}`}
										</p>
									</div>
								</div>
								{o.recurring && (
									<Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
								)}
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
