/**
 * Expand stored calendar rows into concrete occurrences for a date range, and
 * derive the daily-digest reminder list. Pure: callers pass already-serialized
 * rows (ISO strings) and the range/now, so this is unit-testable with no DB.
 *
 * A recurring "master" row is expanded into its occurrences; a single-occurrence
 * override row (`seriesId` set) either replaces one occurrence (its own fields)
 * or, when `canceled`, hides it. Overrides are matched to the master occurrence
 * they replace by an exact `${seriesId}:${overrideDate}` key — the same ISO the
 * expander emits as `occurrenceStart`, so the round-trip is stable.
 */

import { expandRecurrence, type Recurrence } from "./recurrence";

/** A calendar row as serialized by the API (`serializeCalendarEvent`). */
export interface CalendarEventRow {
	id: string;
	title: string;
	description: string | null;
	location: string | null;
	startAt: string;
	endAt: string | null;
	allDay: boolean;
	recurrence: Recurrence;
	recurrenceEnd: string | null;
	reminderMinutes: number | null;
	tags: string[];
	seriesId: string | null;
	overrideDate: string | null;
	canceled: boolean;
}

/** One concrete instance of an event on a specific date. */
export interface Occurrence {
	/** Stable React key: data-row id + occurrence identity. */
	key: string;
	/** Row that supplies the fields (master, override, or single-event id). */
	eventId: string;
	/** Series master id when part of a recurring series, else null. Scoped
	 *  edits/deletes ("this / following / all") target this. */
	masterId: string | null;
	/** Identity of this occurrence within its series (ISO). For overrides this
	 *  is the original date replaced; for singles it equals `start`. */
	occurrenceStart: string;
	start: string;
	end: string | null;
	title: string;
	description: string | null;
	location: string | null;
	allDay: boolean;
	tags: string[];
	reminderMinutes: number | null;
	recurring: boolean;
	/** The series' recurrence rule (looked up from the master for overrides), so
	 *  an "all/following" edit form shows the true frequency. */
	recurrence: Recurrence;
	recurrenceEnd: string | null;
}

function toOccurrence(
	row: CalendarEventRow,
	occurrenceStart: string,
	start: string,
	masterId: string | null,
	recurrence: Recurrence,
	recurrenceEnd: string | null,
): Occurrence {
	// Preserve the event's duration when a recurring instance's start differs
	// from the row's own startAt.
	let end: string | null = row.endAt;
	if (row.endAt && start !== row.startAt) {
		const dur = new Date(row.endAt).getTime() - new Date(row.startAt).getTime();
		end = new Date(new Date(start).getTime() + dur).toISOString();
	}
	return {
		key: `${row.id}:${occurrenceStart}`,
		eventId: row.id,
		masterId,
		occurrenceStart,
		start,
		end,
		title: row.title,
		description: row.description,
		location: row.location,
		allDay: row.allDay,
		tags: row.tags,
		reminderMinutes: row.reminderMinutes,
		recurring: masterId != null,
		recurrence,
		recurrenceEnd,
	};
}

/** All occurrences within `[fromISO, toISO]`, soonest first. */
export function expandEvents(
	rows: CalendarEventRow[],
	fromISO: string,
	toISO: string,
): Occurrence[] {
	const from = new Date(fromISO);
	const to = new Date(toISO);
	const masters = rows.filter((r) => !r.seriesId);
	const overrides = rows.filter((r) => r.seriesId);
	const masterById = new Map(masters.map((m) => [m.id, m]));
	// A master occurrence is suppressed when an override (replacement OR
	// tombstone) exists for that exact date.
	const overridden = new Set(
		overrides.map((o) => `${o.seriesId}:${o.overrideDate}`),
	);

	const out: Occurrence[] = [];

	for (const m of masters) {
		const isSeries = m.recurrence !== "none";
		const dates = expandRecurrence(
			new Date(m.startAt),
			m.recurrence,
			m.recurrenceEnd ? new Date(m.recurrenceEnd) : null,
			from,
			to,
		);
		for (const occ of dates) {
			const iso = occ.toISOString();
			if (isSeries && overridden.has(`${m.id}:${iso}`)) continue;
			out.push(
				toOccurrence(
					m,
					iso,
					iso,
					isSeries ? m.id : null,
					m.recurrence,
					m.recurrenceEnd,
				),
			);
		}
	}

	for (const o of overrides) {
		if (o.canceled) continue;
		const start = new Date(o.startAt);
		if (start < from || start > to) continue;
		// The series' rule comes from the master, not the override row itself.
		const master = o.seriesId ? masterById.get(o.seriesId) : undefined;
		out.push(
			toOccurrence(
				o,
				o.overrideDate as string,
				o.startAt,
				o.seriesId,
				master?.recurrence ?? "none",
				master?.recurrenceEnd ?? null,
			),
		);
	}

	out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
	return out;
}

/** A calendar reminder surfaced in the daily digest. */
export interface ReminderItem {
	title: string;
	start: string;
	allDay: boolean;
}

/**
 * Occurrences whose reminder should appear in today's digest: a reminder is set
 * (`reminderMinutes != null`), its lead time has been reached
 * (`start - reminderMinutes <= now`), and the event has not yet started
 * (`start >= now`). Soonest first. `lookaheadDays` bounds expansion — it must
 * exceed the largest reminder lead (default 60 days covers up to ~4-week leads).
 */
export function upcomingReminders(
	rows: CalendarEventRow[],
	now: Date,
	lookaheadDays = 60,
): ReminderItem[] {
	const to = new Date(now.getTime() + lookaheadDays * 86_400_000);
	const nowMs = now.getTime();
	return expandEvents(rows, now.toISOString(), to.toISOString())
		.filter((o) => o.reminderMinutes != null)
		.filter((o) => {
			const startMs = new Date(o.start).getTime();
			const remindAt = startMs - (o.reminderMinutes as number) * 60_000;
			return remindAt <= nowMs && startMs >= nowMs;
		})
		.map((o) => ({ title: o.title, start: o.start, allDay: o.allDay }));
}
