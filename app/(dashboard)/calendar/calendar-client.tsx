"use client";

import { ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetcher } from "@/lib/api-client";
import {
	dayKey,
	fmtDayHeading,
	fmtTime,
	relativeDay,
} from "@/lib/calendar/display";
import type { Occurrence } from "@/lib/calendar/expand";
import { cn } from "@/lib/utils";
import { EventDialog } from "./event-dialog";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const AGENDA_DAYS = 60;

function pad(n: number) {
	return String(n).padStart(2, "0");
}
/** Local YYYY-MM-DD for a Date (matches `dayKey` for timed events). */
function keyOf(d: Date) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Group occurrences (already sorted by start) into a day-keyed map. */
function groupByDay(occs: Occurrence[]): Map<string, Occurrence[]> {
	const map = new Map<string, Occurrence[]>();
	for (const o of occs) {
		const k = dayKey(o.start, o.allDay);
		const arr = map.get(k);
		if (arr) arr.push(o);
		else map.set(k, [o]);
	}
	return map;
}

export function CalendarClient() {
	const [view, setView] = useState<"month" | "agenda">("month");
	const [cursor, setCursor] = useState(() => {
		const n = new Date();
		return new Date(n.getFullYear(), n.getMonth(), 1);
	});
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<Occurrence | null>(null);
	const [defaultDateKey, setDefaultDateKey] = useState<string | null>(null);

	// 6-week (42-cell) grid starting Monday on/before the 1st of the month.
	const grid = useMemo(() => {
		const year = cursor.getFullYear();
		const month = cursor.getMonth();
		const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-start
		const cells: Date[] = [];
		for (let i = 0; i < 42; i++) cells.push(new Date(year, month, 1 - offset + i));
		return {
			cells,
			month,
			from: new Date(year, month, 1 - offset, 0, 0, 0, 0).toISOString(),
			to: new Date(year, month, 1 - offset + 41, 23, 59, 59, 999).toISOString(),
		};
	}, [cursor]);

	// Agenda range is anchored to today (stable within the day → no SWR churn).
	const agenda = useMemo(() => {
		const n = new Date();
		return {
			from: new Date(n.getFullYear(), n.getMonth(), n.getDate()).toISOString(),
			to: new Date(
				n.getFullYear(),
				n.getMonth(),
				n.getDate() + AGENDA_DAYS,
				23,
				59,
				59,
				999,
			).toISOString(),
		};
	}, []);

	const monthUrl =
		view === "month"
			? `/api/calendar/occurrences?from=${encodeURIComponent(grid.from)}&to=${encodeURIComponent(grid.to)}`
			: null;
	const agendaUrl =
		view === "agenda"
			? `/api/calendar/occurrences?from=${encodeURIComponent(agenda.from)}&to=${encodeURIComponent(agenda.to)}`
			: null;
	const { data: monthOccs, mutate: mutateMonth } = useSWR<Occurrence[]>(
		monthUrl,
		fetcher,
	);
	const { data: agendaOccs, mutate: mutateAgenda } = useSWR<Occurrence[]>(
		agendaUrl,
		fetcher,
	);
	const revalidate = () => {
		mutateMonth();
		mutateAgenda();
	};

	const byDay = useMemo(() => groupByDay(monthOccs ?? []), [monthOccs]);
	const agendaGroups = useMemo(
		() =>
			[...groupByDay(agendaOccs ?? []).entries()].sort((a, b) =>
				a[0] < b[0] ? -1 : 1,
			),
		[agendaOccs],
	);

	function openCreate(dateKey?: string) {
		setEditing(null);
		setDefaultDateKey(dateKey ?? null);
		setDialogOpen(true);
	}
	function openEdit(o: Occurrence) {
		setEditing(o);
		setDefaultDateKey(null);
		setDialogOpen(true);
	}

	const todayKey = keyOf(new Date());
	const monthLabel = cursor.toLocaleDateString(undefined, {
		month: "long",
		year: "numeric",
	});

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						Calendar
					</h1>
					<p className="text-sm text-muted-foreground sm:text-base">
						Your events, reminders and recurring plans.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="inline-flex rounded-md border border-border p-0.5">
						{(["month", "agenda"] as const).map((v) => (
							<button
								key={v}
								type="button"
								onClick={() => setView(v)}
								className={cn(
									"rounded px-3 py-1 text-sm font-medium capitalize transition-colors",
									view === v
										? "bg-primary text-primary-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{v}
							</button>
						))}
					</div>
					<Button size="sm" onClick={() => openCreate()}>
						<Plus className="mr-2 h-4 w-4" /> New event
					</Button>
				</div>
			</div>

			{view === "month" ? (
				<Card>
					<CardContent className="p-3 sm:p-4">
						<div className="mb-3 flex items-center justify-between">
							<h2 className="text-lg font-semibold">{monthLabel}</h2>
							<div className="flex items-center gap-1">
								<Button
									variant="outline"
									size="sm"
									aria-label="Previous month"
									onClick={() =>
										setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
									}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										const n = new Date();
										setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
									}}
								>
									Today
								</Button>
								<Button
									variant="outline"
									size="sm"
									aria-label="Next month"
									onClick={() =>
										setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
									}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
							{WEEKDAYS.map((d) => (
								<div key={d} className="py-1">
									{d}
								</div>
							))}
						</div>

						<div className="grid grid-cols-7 gap-1">
							{grid.cells.map((cell) => {
								const k = keyOf(cell);
								const items = byDay.get(k) ?? [];
								const inMonth = cell.getMonth() === grid.month;
								const isToday = k === todayKey;
								return (
									// A div (not a button) so the event chips below can be real
									// buttons — a button cannot nest a button. Kept keyboard-
									// operable so clicking a day to add an event still works.
									<div
										key={k}
										role="button"
										tabIndex={0}
										aria-label={`Add event on ${k}`}
										onClick={() => openCreate(k)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												openCreate(k);
											}
										}}
										className={cn(
											"flex min-h-20 cursor-pointer flex-col gap-1 rounded-md border border-transparent p-1 text-left hover:border-border sm:min-h-24",
											inMonth
												? "bg-muted/30"
												: "bg-transparent text-muted-foreground/50",
										)}
									>
										<span
											className={cn(
												"mx-1 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
												isToday && "bg-primary font-semibold text-primary-foreground",
											)}
										>
											{cell.getDate()}
										</span>
										<div className="flex flex-col gap-0.5">
											{items.slice(0, 3).map((o) => (
												<button
													type="button"
													key={o.key}
													onClick={(e) => {
														e.stopPropagation();
														openEdit(o);
													}}
													className="truncate rounded bg-primary/15 px-1 py-0.5 text-left text-[11px] leading-tight text-foreground hover:bg-primary/25"
												>
													{!o.allDay && (
														<span className="tabular-nums text-muted-foreground">
															{fmtTime(o.start)}{" "}
														</span>
													)}
													{o.title}
												</button>
											))}
											{items.length > 3 && (
												<span className="px-1 text-[11px] text-muted-foreground">
													+{items.length - 3} more
												</span>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{agendaGroups.length === 0 ? (
						<Card>
							<CardContent className="py-8 text-center text-sm text-muted-foreground">
								No events in the next {AGENDA_DAYS} days.
							</CardContent>
						</Card>
					) : (
						agendaGroups.map(([k, items]) => (
							<div key={k} className="space-y-2">
								<div className="flex items-baseline gap-2">
									<h3 className="text-sm font-semibold">{fmtDayHeading(k)}</h3>
									<span className="text-xs text-muted-foreground">
										{relativeDay(k)}
									</span>
								</div>
								<ul className="space-y-2">
									{items.map((o) => (
										<li key={o.key}>
											<button
												type="button"
												onClick={() => openEdit(o)}
												className="flex w-full items-center justify-between gap-3 rounded-md border border-border p-3 text-left hover:bg-accent"
											>
												<div className="flex min-w-0 items-center gap-3">
													<div className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">
														{o.allDay ? "All day" : fmtTime(o.start)}
													</div>
													<div className="min-w-0">
														<p className="truncate text-sm font-medium">
															{o.title}
														</p>
														{o.location && (
															<p className="truncate text-xs text-muted-foreground">
																{o.location}
															</p>
														)}
													</div>
												</div>
												{o.recurring && (
													<Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
												)}
											</button>
										</li>
									))}
								</ul>
							</div>
						))
					)}
				</div>
			)}

			<EventDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				editing={editing}
				defaultDateKey={defaultDateKey}
				onSaved={revalidate}
			/>
		</div>
	);
}
