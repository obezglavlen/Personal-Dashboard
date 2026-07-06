import type { AccountInput } from "@/lib/validations/account";
import type { BookmarkInput } from "@/lib/validations/bookmark";
import type { BudgetInput } from "@/lib/validations/budget";
import type { CalendarEventInput } from "@/lib/validations/calendar";
import type { ExpenseInput } from "@/lib/validations/expense";
import type { GoalInput } from "@/lib/validations/goal";
import type { NoteInput } from "@/lib/validations/note";
import type { RecurringInput } from "@/lib/validations/recurring";
import type { SubscriptionInput } from "@/lib/validations/subscription";
import type { TaskInput } from "@/lib/validations/task";

/**
 * Pure "validated input -> Prisma create data" builders, shared by the CRUD
 * route handlers (`lib/api/resources.ts`) and the AI write tools
 * (`lib/ai/tools.ts`) so both paths produce identical rows: same defaults,
 * same date coercion, and — critically — `userId` is always injected here and
 * never taken from the caller's payload.
 *
 * Each builder receives the Zod *output* (money fields already coerced to
 * `number`, etc.) and returns a plain object for `prisma.<model>.create`.
 * Kept side-effect-free so they are unit-testable without a database.
 */

export function buildExpenseData(input: ExpenseInput, userId: string) {
	const { date, currency, tags, ...rest } = input;
	return {
		...rest,
		currency: currency ?? "USD",
		tags: tags ?? [],
		date: date ? new Date(date) : new Date(),
		userId,
	};
}

export function buildTaskData(input: TaskInput, userId: string) {
	const { dueDate, ...rest } = input;
	return {
		...rest,
		dueDate: dueDate ? new Date(dueDate) : null,
		userId,
	};
}

export function buildNoteData(input: NoteInput, userId: string) {
	return { ...input, userId };
}

export function buildBookmarkData(input: BookmarkInput, userId: string) {
	return { ...input, userId };
}

export function buildBudgetData(input: BudgetInput, userId: string) {
	const { currency, tags, period, ...rest } = input;
	return {
		...rest,
		currency: currency ?? "USD",
		tags: tags ?? [],
		period: period ?? "monthly",
		userId,
	};
}

export function buildSubscriptionData(input: SubscriptionInput, userId: string) {
	const { startDate, tags, ...rest } = input;
	return {
		...rest,
		tags: tags ?? [],
		startDate: startDate ? new Date(startDate) : new Date(),
		userId,
	};
}

export function buildGoalData(input: GoalInput, userId: string) {
	const { currency, current, ...rest } = input;
	return {
		...rest,
		currency: currency ?? "USD",
		current: current ?? 0,
		userId,
	};
}

export function buildAccountData(input: AccountInput, userId: string) {
	const { currency, type, ...rest } = input;
	return {
		...rest,
		currency: currency ?? "USD",
		type: type ?? "cash",
		userId,
	};
}

export function buildCalendarEventData(
	input: CalendarEventInput,
	userId: string,
) {
	const {
		startAt,
		endAt,
		recurrenceEnd,
		recurrence,
		allDay,
		description,
		location,
		reminderMinutes,
		tags,
		...rest
	} = input;
	return {
		...rest, // title
		description: description ?? null,
		location: location ?? null,
		allDay: allDay ?? false,
		recurrence: recurrence ?? "none",
		startAt: new Date(startAt),
		endAt: endAt ? new Date(endAt) : null,
		recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
		reminderMinutes: reminderMinutes ?? null,
		tags: tags ?? [],
		userId,
	};
}

export function buildRecurringData(input: RecurringInput, userId: string) {
	const { startDate, endDate, currency, tags, ...rest } = input;
	return {
		...rest,
		currency: currency ?? "USD",
		tags: tags ?? [],
		startDate: startDate ? new Date(startDate) : new Date(),
		endDate: endDate ? new Date(endDate) : null,
		userId,
	};
}
