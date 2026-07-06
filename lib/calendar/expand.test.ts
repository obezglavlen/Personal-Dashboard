import { describe, expect, it } from "vitest";
import { type CalendarEventRow, expandEvents, upcomingReminders } from "./expand";

/** Build a row with sensible defaults; override per test. */
function row(over: Partial<CalendarEventRow>): CalendarEventRow {
	return {
		id: "e1",
		title: "Event",
		description: null,
		location: null,
		startAt: "2026-07-06T09:00:00.000Z",
		endAt: null,
		allDay: false,
		recurrence: "none",
		recurrenceEnd: null,
		reminderMinutes: null,
		tags: [],
		seriesId: null,
		overrideDate: null,
		canceled: false,
		...over,
	};
}

const JULY = ["2026-07-01T00:00:00.000Z", "2026-07-31T23:59:59.000Z"] as const;
const starts = (rows: CalendarEventRow[]) =>
	expandEvents(rows, JULY[0], JULY[1]).map((o) => o.start.slice(0, 16));

describe("expandEvents", () => {
	it("includes a single event in range and excludes one outside it", () => {
		expect(starts([row({ startAt: "2026-07-10T09:00:00.000Z" })])).toEqual([
			"2026-07-10T09:00",
		]);
		expect(starts([row({ startAt: "2026-09-10T09:00:00.000Z" })])).toEqual([]);
	});

	it("expands a weekly master", () => {
		expect(starts([row({ recurrence: "weekly" })])).toEqual([
			"2026-07-06T09:00",
			"2026-07-13T09:00",
			"2026-07-20T09:00",
			"2026-07-27T09:00",
		]);
	});

	it("preserves duration across recurring instances", () => {
		const occ = expandEvents(
			[
				row({
					recurrence: "weekly",
					startAt: "2026-07-06T09:00:00.000Z",
					endAt: "2026-07-06T10:30:00.000Z",
				}),
			],
			JULY[0],
			JULY[1],
		);
		expect(occ[1].start.slice(0, 16)).toBe("2026-07-13T09:00");
		expect(occ[1].end?.slice(0, 16)).toBe("2026-07-13T10:30");
	});

	it("lets a non-canceled override replace one occurrence", () => {
		const master = row({ id: "m", recurrence: "weekly" });
		const override = row({
			id: "o",
			title: "Moved",
			seriesId: "m",
			overrideDate: "2026-07-13T09:00:00.000Z",
			startAt: "2026-07-13T14:00:00.000Z",
		});
		const occ = expandEvents([master, override], JULY[0], JULY[1]);
		const jul13 = occ.filter((o) => o.start.startsWith("2026-07-13"));
		expect(jul13).toHaveLength(1);
		expect(jul13[0].title).toBe("Moved");
		expect(jul13[0].start.slice(0, 16)).toBe("2026-07-13T14:00");
		// The occurrence still identifies with the original series date.
		expect(jul13[0].masterId).toBe("m");
		expect(jul13[0].occurrenceStart).toBe("2026-07-13T09:00:00.000Z");
	});

	it("hides an occurrence with a canceled (tombstone) override", () => {
		const master = row({ id: "m", recurrence: "weekly" });
		const tombstone = row({
			id: "t",
			seriesId: "m",
			overrideDate: "2026-07-20T09:00:00.000Z",
			canceled: true,
		});
		expect(starts([master, tombstone])).toEqual([
			"2026-07-06T09:00",
			"2026-07-13T09:00",
			"2026-07-27T09:00",
		]);
	});

	it("sorts occurrences from multiple events by start", () => {
		expect(
			starts([
				row({ id: "a", startAt: "2026-07-20T09:00:00.000Z" }),
				row({ id: "b", startAt: "2026-07-05T09:00:00.000Z" }),
			]),
		).toEqual(["2026-07-05T09:00", "2026-07-20T09:00"]);
	});
});

describe("upcomingReminders", () => {
	const now = new Date("2026-07-06T12:00:00.000Z");

	it("includes an event whose reminder lead has been reached", () => {
		const items = upcomingReminders(
			[
				row({
					title: "Dentist",
					startAt: "2026-07-07T12:00:00.000Z",
					reminderMinutes: 1440, // 1 day before → remindAt == now
				}),
			],
			now,
		);
		expect(items.map((i) => i.title)).toEqual(["Dentist"]);
	});

	it("excludes an event whose reminder lead has not yet been reached", () => {
		const items = upcomingReminders(
			[
				row({
					startAt: "2026-07-10T12:00:00.000Z",
					reminderMinutes: 60, // remindAt is 2026-07-10T11:00, still future
				}),
			],
			now,
		);
		expect(items).toEqual([]);
	});

	it("excludes past events and events with no reminder", () => {
		const items = upcomingReminders(
			[
				row({ startAt: "2026-07-06T11:00:00.000Z", reminderMinutes: 60 }), // past
				row({ startAt: "2026-07-08T12:00:00.000Z", reminderMinutes: null }), // no reminder
			],
			now,
		);
		expect(items).toEqual([]);
	});

	it("surfaces recurring occurrences once their lead is reached", () => {
		const items = upcomingReminders(
			[
				row({
					title: "Standup",
					startAt: "2026-07-01T12:00:00.000Z",
					recurrence: "daily",
					reminderMinutes: 30,
				}),
			],
			now,
		);
		// Next standup is today 12:00 (== now); remindAt 11:30 already passed.
		expect(items[0]?.title).toBe("Standup");
		expect(items[0]?.start).toBe("2026-07-06T12:00:00.000Z");
	});
});
