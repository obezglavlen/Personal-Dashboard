/**
 * Server-side calendar operations backed by Prisma. Occurrence listing expands
 * stored rows (see lib/calendar/expand) for a range; edit/delete implement the
 * Google-style "this / this-and-following / all" scopes on recurring series.
 *
 * Scope semantics on a recurring master (`id` is always the master's id for a
 * recurring occurrence — the client targets `masterId`):
 *   • all       — update the master row in place (every occurrence changes).
 *   • this      — upsert a single-occurrence override row keyed by
 *                 (seriesId, overrideDate); a delete writes a `canceled`
 *                 tombstone that hides just that occurrence.
 *   • following — truncate the master at the occurrence (recurrenceEnd = the day
 *                 before) and, for an edit, start a fresh series from it; drop
 *                 any overrides at/after the split.
 * Single events (recurrence "none") ignore scope and are updated/deleted directly.
 */

import { ApiError } from "@/lib/api/errors";
import { serializeCalendarEvent } from "@/lib/api/resources";
import { prisma } from "@/lib/db";
import type { CalendarEditInput, EditScope } from "@/lib/validations/calendar";
import { type CalendarEventRow, expandEvents, type Occurrence } from "./expand";

const DAY_MS = 86_400_000;

type EventRow = NonNullable<
	Awaited<ReturnType<typeof prisma.calendarEvent.findFirst>>
>;

/** Column values for any event field the client actually sent. */
function coerce(input: CalendarEditInput) {
	const out: {
		title?: string;
		description?: string | null;
		location?: string | null;
		startAt?: Date;
		endAt?: Date | null;
		allDay?: boolean;
		recurrence?: string;
		recurrenceEnd?: Date | null;
		reminderMinutes?: number | null;
		tags?: string[];
	} = {};
	if (input.title !== undefined) out.title = input.title;
	if (input.description !== undefined)
		out.description = input.description ?? null;
	if (input.location !== undefined) out.location = input.location ?? null;
	if (input.startAt !== undefined) out.startAt = new Date(input.startAt);
	if (input.endAt !== undefined)
		out.endAt = input.endAt ? new Date(input.endAt) : null;
	if (input.allDay !== undefined) out.allDay = input.allDay;
	if (input.recurrence !== undefined) out.recurrence = input.recurrence;
	if (input.recurrenceEnd !== undefined)
		out.recurrenceEnd = input.recurrenceEnd ? new Date(input.recurrenceEnd) : null;
	if (input.reminderMinutes !== undefined)
		out.reminderMinutes = input.reminderMinutes ?? null;
	if (input.tags !== undefined) out.tags = input.tags ?? [];
	return out;
}

/** Resolve the start/end for a detached occurrence (override or split), keeping
 *  the master's duration unless the caller changed the times. */
function detachedTimes(event: EventRow, c: ReturnType<typeof coerce>, occ: Date) {
	const startAt = c.startAt ?? occ;
	const endAt =
		"endAt" in c
			? (c.endAt ?? null)
			: event.endAt
				? new Date(startAt.getTime() + (event.endAt.getTime() - event.startAt.getTime()))
				: null;
	return { startAt, endAt };
}

export async function listOccurrences(
	userId: string,
	fromISO: string,
	toISO: string,
): Promise<Occurrence[]> {
	const rows = await prisma.calendarEvent.findMany({ where: { userId } });
	const serialized = rows.map(serializeCalendarEvent) as CalendarEventRow[];
	return expandEvents(serialized, fromISO, toISO);
}

export async function editEvent(
	userId: string,
	id: string,
	input: CalendarEditInput,
) {
	const event = await prisma.calendarEvent.findFirst({ where: { id, userId } });
	if (!event) throw new ApiError(404, "Event not found");

	const scope: EditScope = input.scope ?? "all";
	const c = coerce(input);

	// Single events (and existing overrides) — plain update, scope irrelevant.
	// A master edited with scope "all" also updates in place.
	if (event.recurrence === "none" || scope === "all") {
		const updated = await prisma.calendarEvent.update({
			where: { id, userId },
			data: c,
		});
		return serializeCalendarEvent(updated);
	}

	if (!input.occurrenceStart)
		throw new ApiError(400, "occurrenceStart required for a scoped edit");
	const occ = new Date(input.occurrenceStart);
	const { startAt, endAt } = detachedTimes(event, c, occ);

	if (scope === "this") {
		const existing = await prisma.calendarEvent.findFirst({
			where: { userId, seriesId: id, overrideDate: occ },
		});
		const data = {
			userId,
			seriesId: id,
			overrideDate: occ,
			canceled: false,
			recurrence: "none",
			recurrenceEnd: null,
			title: c.title ?? event.title,
			description: "description" in c ? (c.description ?? null) : event.description,
			location: "location" in c ? (c.location ?? null) : event.location,
			allDay: c.allDay ?? event.allDay,
			reminderMinutes:
				"reminderMinutes" in c
					? (c.reminderMinutes ?? null)
					: event.reminderMinutes,
			tags: c.tags ?? event.tags,
			startAt,
			endAt,
		};
		const saved = existing
			? await prisma.calendarEvent.update({ where: { id: existing.id }, data })
			: await prisma.calendarEvent.create({ data });
		return serializeCalendarEvent(saved);
	}

	// scope === "following": truncate the master and spin off a new series.
	const originalEnd = event.recurrenceEnd;
	await prisma.calendarEvent.update({
		where: { id, userId },
		data: { recurrenceEnd: new Date(occ.getTime() - DAY_MS) },
	});
	await prisma.calendarEvent.deleteMany({
		where: { userId, seriesId: id, overrideDate: { gte: occ } },
	});
	const created = await prisma.calendarEvent.create({
		data: {
			userId,
			title: c.title ?? event.title,
			description: "description" in c ? (c.description ?? null) : event.description,
			location: "location" in c ? (c.location ?? null) : event.location,
			allDay: c.allDay ?? event.allDay,
			recurrence: c.recurrence ?? event.recurrence,
			recurrenceEnd: "recurrenceEnd" in c ? (c.recurrenceEnd ?? null) : originalEnd,
			reminderMinutes:
				"reminderMinutes" in c
					? (c.reminderMinutes ?? null)
					: event.reminderMinutes,
			tags: c.tags ?? event.tags,
			startAt,
			endAt,
		},
	});
	return serializeCalendarEvent(created);
}

export async function deleteEvent(
	userId: string,
	id: string,
	scope: EditScope,
	occurrenceStart?: string,
): Promise<void> {
	const event = await prisma.calendarEvent.findFirst({ where: { id, userId } });
	if (!event) throw new ApiError(404, "Event not found");

	// Whole series, or a single event.
	if (event.recurrence === "none" || scope === "all") {
		if (event.recurrence !== "none") {
			await prisma.calendarEvent.deleteMany({ where: { userId, seriesId: id } });
		}
		await prisma.calendarEvent.delete({ where: { id, userId } });
		return;
	}

	if (!occurrenceStart)
		throw new ApiError(400, "occurrenceStart required for a scoped delete");
	const occ = new Date(occurrenceStart);

	if (scope === "this") {
		const existing = await prisma.calendarEvent.findFirst({
			where: { userId, seriesId: id, overrideDate: occ },
		});
		if (existing) {
			await prisma.calendarEvent.update({
				where: { id: existing.id },
				data: { canceled: true },
			});
		} else {
			await prisma.calendarEvent.create({
				data: {
					userId,
					seriesId: id,
					overrideDate: occ,
					canceled: true,
					recurrence: "none",
					title: event.title,
					startAt: occ,
					allDay: event.allDay,
				},
			});
		}
		return;
	}

	// following
	await prisma.calendarEvent.update({
		where: { id, userId },
		data: { recurrenceEnd: new Date(occ.getTime() - DAY_MS) },
	});
	await prisma.calendarEvent.deleteMany({
		where: { userId, seriesId: id, overrideDate: { gte: occ } },
	});
}
