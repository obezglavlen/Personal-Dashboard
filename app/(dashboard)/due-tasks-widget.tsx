"use client";

import { ArrowRight, CircleAlert, Clock } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useResource } from "@/lib/hooks/use-resource";

type Task = {
	id: string;
	title: string;
	status: string;
	priority: string;
	dueDate: string | null;
};

const WINDOW_DAYS = 7;

/** Whole days from today (UTC date-only) to `iso`. Negative = overdue. */
function daysUntil(iso: string): number {
	const due = new Date(iso);
	const now = new Date();
	const a = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
	const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return Math.round((a - b) / 86_400_000);
}

function whenLabel(days: number): string {
	if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
	if (days === 0) return "due today";
	if (days === 1) return "due tomorrow";
	return `in ${days} days`;
}

/**
 * Dashboard widget: open tasks with a due date that is overdue or within the
 * next 7 days, soonest first. Done tasks and undated tasks are excluded.
 */
export function DueTasksWidget() {
	const { items: tasks } = useResource<Task>("/api/tasks");

	const due = useMemo(() => {
		return tasks
			.filter((t) => t.status !== "done" && t.dueDate)
			.map((t) => ({ task: t, days: daysUntil(t.dueDate as string) }))
			.filter((d) => d.days <= WINDOW_DAYS)
			.sort((a, b) => a.days - b.days)
			.slice(0, 6);
	}, [tasks]);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>Due Soon</CardTitle>
					<CardDescription>
						Open tasks due within {WINDOW_DAYS} days
					</CardDescription>
				</div>
				<Link
					href="/tasks"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					View all <ArrowRight className="h-3 w-3" />
				</Link>
			</CardHeader>
			<CardContent>
				{due.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Nothing due in the next {WINDOW_DAYS} days.
					</p>
				) : (
					<ul className="space-y-2">
						{due.map(({ task, days }) => {
							const overdue = days < 0;
							return (
								<li
									key={task.id}
									className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
								>
									<div className="flex min-w-0 items-center gap-3">
										{overdue ? (
											<CircleAlert className="h-4 w-4 shrink-0 text-destructive" />
										) : (
											<Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
										)}
										<div className="min-w-0">
											<p className="truncate text-sm font-medium">
												{task.title}
											</p>
											<p
												className={`text-xs ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}
											>
												{whenLabel(days)}
											</p>
										</div>
									</div>
									<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
										{task.priority}
									</span>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
