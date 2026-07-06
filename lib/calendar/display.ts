/**
 * Client-side display helpers for calendar occurrences: reminder/recurrence
 * option lists for the form, and small date formatters shared by the calendar
 * page and the dashboard widget. All-day events are stored at UTC midnight, so
 * their day is the UTC date; timed events are shown in the viewer's local time.
 */

import type { Recurrence } from "./recurrence";

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
	{ value: "none", label: "Does not repeat" },
	{ value: "daily", label: "Daily" },
	{ value: "weekly", label: "Weekly" },
	{ value: "monthly", label: "Monthly" },
	{ value: "yearly", label: "Yearly" },
];

/** Reminder lead times, in minutes. "none" is the sentinel for no reminder
 *  (Radix Select items cannot use an empty-string value). */
export const REMINDER_OPTIONS: { value: string; label: string }[] = [
	{ value: "none", label: "No reminder" },
	{ value: "0", label: "At time of event" },
	{ value: "5", label: "5 minutes before" },
	{ value: "15", label: "15 minutes before" },
	{ value: "30", label: "30 minutes before" },
	{ value: "60", label: "1 hour before" },
	{ value: "120", label: "2 hours before" },
	{ value: "1440", label: "1 day before" },
	{ value: "2880", label: "2 days before" },
	{ value: "10080", label: "1 week before" },
];

export function reminderLabel(minutes: number | null): string {
	if (minutes == null) return "";
	return (
		REMINDER_OPTIONS.find((o) => o.value === String(minutes))?.label ??
		`${minutes} min before`
	);
}

/** Local calendar-day key (YYYY-MM-DD) for grouping occurrences into day cells. */
export function dayKey(iso: string, allDay: boolean): string {
	if (allDay) return iso.slice(0, 10);
	const d = new Date(iso);
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

/** Local time of an occurrence, e.g. "9:00 AM". */
export function fmtTime(iso: string): string {
	return new Date(iso).toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
}

/** Whole days from today (local) to a YYYY-MM-DD day key. Negative = past. */
export function daysFromToday(key: string): number {
	const [y, m, d] = key.split("-").map(Number);
	const target = Date.UTC(y, m - 1, d);
	const now = new Date();
	const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	return Math.round((target - today) / 86_400_000);
}

/** Relative day label from a YYYY-MM-DD key: Today / Tomorrow / in N days. */
export function relativeDay(key: string): string {
	const n = daysFromToday(key);
	if (n === 0) return "Today";
	if (n === 1) return "Tomorrow";
	if (n === -1) return "Yesterday";
	if (n < 0) return `${-n} days ago`;
	return `in ${n} days`;
}

/** Full heading for a day, e.g. "Mon, Jul 6". */
export function fmtDayHeading(key: string): string {
	const [y, m, d] = key.split("-").map(Number);
	return new Date(y, m - 1, d).toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}
