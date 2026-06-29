import { prisma } from "@/lib/db";
import { accountSchema } from "@/lib/validations/account";
import { bookmarkSchema } from "@/lib/validations/bookmark";
import { budgetSchema } from "@/lib/validations/budget";
import { expenseSchema } from "@/lib/validations/expense";
import { goalSchema } from "@/lib/validations/goal";
import { noteSchema } from "@/lib/validations/note";
import { subscriptionSchema } from "@/lib/validations/subscription";
import { taskSchema } from "@/lib/validations/task";
import { taxConfigSchema, taxRecordSchema } from "@/lib/validations/tax";
import { crudHandlers } from "./crud";

/**
 * Resource definitions: a single source of truth for each model's CRUD
 * behaviour, shared by the collection (`/route.ts`) and item (`/[id]/route.ts`)
 * route files. Decimal/Date serialization and date-field transforms live here.
 */

// biome-ignore lint/suspicious/noExplicitAny: serializers run over heterogeneous Prisma rows
type Row = any;

const iso = (d: Date) => d.toISOString();
const num = (v: unknown) => Number(v);
const numOrNull = (v: unknown) => (v != null ? Number(v) : null);

/**
 * Row serializers, hoisted to module scope so both `crudHandlers` (below) and
 * the data-export route (`/api/export`) produce identical JSON. Models without
 * Decimal/Date fields (bookmark, note, task) serialize as-is and need no entry.
 */
export const serializeSubscription = (s: Row) => ({
	id: s.id,
	name: s.name,
	price: num(s.price),
	period: s.period,
	startDate: iso(s.startDate),
	category: s.category,
	currency: s.currency,
	autoExpense: s.autoExpense,
	lastPostedAt: s.lastPostedAt ? iso(s.lastPostedAt) : null,
	createdAt: iso(s.createdAt),
	updatedAt: iso(s.updatedAt),
});

export const serializeTaxConfig = (c: Row) => ({
	id: c.id,
	userId: c.userId,
	name: c.name,
	rate: num(c.rate),
	staticAmount: numOrNull(c.staticAmount),
	currency: c.currency,
	createdAt: iso(c.createdAt),
	updatedAt: iso(c.updatedAt),
});

export const serializeTaxRecord = (r: Row) => ({
	id: r.id,
	userId: r.userId,
	type: r.type,
	taxConfigId: r.taxConfigId,
	taxConfigName: r.taxConfig?.name ?? null,
	currency: r.currency,
	date: iso(r.date),
	amount: numOrNull(r.amount),
	description: r.description,
	createdAt: iso(r.createdAt),
	updatedAt: iso(r.updatedAt),
});

export const serializeExpense = (e: Row) => ({
	id: e.id,
	userId: e.userId,
	name: e.name,
	amount: num(e.amount),
	currency: e.currency,
	date: iso(e.date),
	tags: e.tags,
	createdAt: iso(e.createdAt),
	updatedAt: iso(e.updatedAt),
});

export const noteHandlers = crudHandlers({
	delegate: prisma.note,
	createSchema: noteSchema,
	updateSchema: noteSchema,
	orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
});

export const bookmarkHandlers = crudHandlers({
	delegate: prisma.bookmark,
	createSchema: bookmarkSchema,
	updateSchema: bookmarkSchema,
	orderBy: { createdAt: "desc" },
});

export const taskHandlers = crudHandlers({
	delegate: prisma.task,
	createSchema: taskSchema,
	updateSchema: taskSchema.partial(),
	orderBy: [{ status: "asc" }, { createdAt: "desc" }],
	toCreateData: ({ dueDate, ...rest }, userId) => ({
		...rest,
		dueDate: dueDate ? new Date(dueDate) : null,
		userId,
	}),
	toUpdateData: ({ dueDate, ...rest }) => ({
		...rest,
		...(dueDate !== undefined && {
			dueDate: dueDate ? new Date(dueDate) : null,
		}),
	}),
});

export const subscriptionHandlers = crudHandlers({
	delegate: prisma.subscription,
	createSchema: subscriptionSchema,
	updateSchema: subscriptionSchema.partial(),
	orderBy: [{ createdAt: "desc" }],
	serialize: serializeSubscription,
	toCreateData: ({ startDate, ...rest }, userId) => ({
		...rest,
		startDate: startDate ? new Date(startDate) : new Date(),
		userId,
	}),
	toUpdateData: ({ startDate, ...rest }) => ({
		...rest,
		...(startDate !== undefined && {
			startDate: startDate ? new Date(startDate) : new Date(),
		}),
	}),
});

export const taxConfigHandlers = crudHandlers({
	delegate: prisma.taxConfig,
	createSchema: taxConfigSchema,
	updateSchema: taxConfigSchema.partial(),
	orderBy: { name: "asc" },
	serialize: serializeTaxConfig,
});

export const taxRecordHandlers = crudHandlers({
	delegate: prisma.taxRecord,
	createSchema: taxRecordSchema,
	updateSchema: taxRecordSchema.partial(),
	orderBy: [{ date: "desc" }, { createdAt: "desc" }],
	include: { taxConfig: true },
	serialize: serializeTaxRecord,
	toCreateData: ({ month, year, ...rest }, userId) => ({
		...rest,
		date: new Date(Date.UTC(year, month - 1, 1)),
		userId,
	}),
	toUpdateData: ({ month, year, ...rest }) => ({
		...rest,
		...(month !== undefined &&
			year !== undefined && {
				date: new Date(Date.UTC(year, month - 1, 1)),
			}),
	}),
});

export const serializeBudget = (b: Row) => ({
	id: b.id,
	userId: b.userId,
	name: b.name,
	amount: num(b.amount),
	currency: b.currency,
	period: b.period,
	tags: b.tags,
	createdAt: iso(b.createdAt),
	updatedAt: iso(b.updatedAt),
});

export const serializeAccount = (a: Row) => ({
	id: a.id,
	userId: a.userId,
	name: a.name,
	type: a.type,
	balance: num(a.balance),
	currency: a.currency,
	createdAt: iso(a.createdAt),
	updatedAt: iso(a.updatedAt),
});

export const serializeGoal = (g: Row) => ({
	id: g.id,
	userId: g.userId,
	name: g.name,
	target: num(g.target),
	current: num(g.current),
	currency: g.currency,
	createdAt: iso(g.createdAt),
	updatedAt: iso(g.updatedAt),
});

export const accountHandlers = crudHandlers({
	delegate: prisma.financialAccount,
	createSchema: accountSchema,
	updateSchema: accountSchema.partial(),
	orderBy: [{ createdAt: "desc" }],
	serialize: serializeAccount,
	toCreateData: ({ currency, type, ...rest }, userId) => ({
		...rest,
		currency: currency ?? "USD",
		type: type ?? "cash",
		userId,
	}),
});

export const goalHandlers = crudHandlers({
	delegate: prisma.goal,
	createSchema: goalSchema,
	updateSchema: goalSchema.partial(),
	orderBy: [{ createdAt: "desc" }],
	serialize: serializeGoal,
	toCreateData: ({ currency, current, ...rest }, userId) => ({
		...rest,
		currency: currency ?? "USD",
		current: current ?? 0,
		userId,
	}),
});

export const budgetHandlers = crudHandlers({
	delegate: prisma.budget,
	createSchema: budgetSchema,
	updateSchema: budgetSchema.partial(),
	orderBy: [{ createdAt: "desc" }],
	serialize: serializeBudget,
	toCreateData: ({ currency, tags, period, ...rest }, userId) => ({
		...rest,
		currency: currency ?? "USD",
		tags: tags ?? [],
		period: period ?? "monthly",
		userId,
	}),
});

export const expenseHandlers = crudHandlers({
	delegate: prisma.expense,
	createSchema: expenseSchema,
	updateSchema: expenseSchema.partial(),
	orderBy: [{ date: "desc" }, { createdAt: "desc" }],
	serialize: serializeExpense,
	toCreateData: ({ date, currency, tags, ...rest }, userId) => ({
		...rest,
		currency: currency ?? "USD",
		tags: tags ?? [],
		date: date ? new Date(date) : new Date(),
		userId,
	}),
	toUpdateData: ({ date, ...rest }) => ({
		...rest,
		...(date !== undefined && { date: date ? new Date(date) : new Date() }),
	}),
});
