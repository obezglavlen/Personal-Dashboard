import { z } from "zod";

export const RECURRENCE_VALUES = [
	"none",
	"daily",
	"weekly",
	"monthly",
	"yearly",
] as const;

/** Scope of an edit/delete on a recurring event, mirroring Google Calendar. */
export const EDIT_SCOPES = ["this", "following", "all"] as const;
export type EditScope = (typeof EDIT_SCOPES)[number];

export const calendarEventSchema = z.object({
	title: z.string().min(1, "Title required").max(200),
	description: z.string().max(2000).optional().nullable(),
	location: z.string().max(200).optional().nullable(),
	/** ISO instant of the (first) occurrence start. */
	startAt: z.string().min(1, "Start required"),
	endAt: z.string().optional().nullable(),
	allDay: z.boolean().optional(),
	recurrence: z.enum(RECURRENCE_VALUES).optional(),
	recurrenceEnd: z.string().optional().nullable(),
	/** Minutes before `startAt` to remind (0–40320 = up to 4 weeks). */
	reminderMinutes: z.number().int().min(0).max(40_320).optional().nullable(),
	tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;

/**
 * PATCH body: any subset of the event fields, plus which occurrences the edit
 * applies to. `occurrenceStart` identifies the clicked instance for
 * `this`/`following` scopes (ignored for `all` and non-recurring events).
 */
export const calendarEditSchema = calendarEventSchema.partial().extend({
	scope: z.enum(EDIT_SCOPES).optional(),
	occurrenceStart: z.string().optional(),
});
export type CalendarEditInput = z.infer<typeof calendarEditSchema>;
