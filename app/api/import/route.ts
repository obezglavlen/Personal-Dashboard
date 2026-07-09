import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api/errors";
import { route } from "@/lib/api/handler";
import { requireUserId } from "@/lib/api/session";
import { prisma } from "@/lib/db";
import { bookmarkSchema } from "@/lib/validations/bookmark";
import { expenseSchema } from "@/lib/validations/expense";
import { noteSchema } from "@/lib/validations/note";
import { subscriptionSchema } from "@/lib/validations/subscription";
import { taskSchema } from "@/lib/validations/task";
import { incomeSchema } from "@/lib/validations/income";
import { taxConfigSchema, taxRecordSchema } from "@/lib/validations/tax";
import { EXPORT_VERSION } from "../export/route";

type Json = Record<string, unknown>;
type Tx = Prisma.TransactionClient;

const arr = (v: unknown): Json[] =>
	Array.isArray(v)
		? (v.filter((x) => x && typeof x === "object") as Json[])
		: [];

const toDate = (v: unknown): Date => {
	const d = v ? new Date(v as string) : new Date();
	return Number.isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Drop null-valued keys so exported raw rows (which carry explicit nulls for
 * empty optional columns, e.g. `description: null`) validate against the create
 * schemas, which use `.optional()` (rejects null) rather than `.nullable()`.
 */
const stripNulls = (row: Json): Json =>
	Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null));

async function handler(req: Request): Promise<Response> {
	const userId = await requireUserId();
	const url = new URL(req.url);
	const replace = url.searchParams.get("mode") === "replace";

	const body = (await req.json().catch(() => null)) as {
		version?: number;
		data?: Json;
	} | null;

	if (!body || typeof body !== "object" || !body.data) {
		throw new ApiError(400, "Invalid import file: missing data");
	}
	if (body.version !== EXPORT_VERSION) {
		throw new ApiError(
			400,
			`Unsupported export version ${body.version ?? "?"} (expected ${EXPORT_VERSION})`,
		);
	}

	const data = body.data;
	const imported: Record<string, number> = {};
	let skipped = 0;

	// Validate-and-build each row with the existing model schemas; rows that
	// fail validation are counted as skipped rather than aborting the import.
	function build<T>(
		key: string,
		schema: { safeParse(v: unknown): { success: boolean; data?: T } },
		make: (input: T, raw: Json) => unknown,
	): unknown[] {
		const out: unknown[] = [];
		for (const raw of arr(data[key])) {
			const parsed = schema.safeParse(stripNulls(raw));
			if (parsed.success) out.push(make(parsed.data as T, raw));
			else skipped++;
		}
		return out;
	}

	const bookmarks = build("bookmarks", bookmarkSchema, (i) => ({
		...i,
		userId,
	}));
	const notes = build("notes", noteSchema, (i) => ({ ...i, userId }));
	const tasks = build("tasks", taskSchema, (i) => {
		const { dueDate, ...rest } = i as { dueDate?: string };
		return { ...rest, dueDate: dueDate ? new Date(dueDate) : null, userId };
	});
	const subscriptions = build("subscriptions", subscriptionSchema, (i) => {
		const { startDate, ...rest } = i as { startDate?: string };
		return { ...rest, startDate: toDate(startDate), userId };
	});
	const expenses = build("expenses", expenseSchema, (i) => {
		const { date, tags, currency, ...rest } = i as {
			date?: string;
			tags?: string[];
			currency?: string;
		};
		return {
			...rest,
			currency: currency ?? "USD",
			tags: tags ?? [],
			date: toDate(date),
			userId,
		};
	});

	// Tax configs are created first so their old ids can be remapped onto the
	// imported tax records (the only cross-reference in the dataset). Each row
	// keeps its source id alongside the create payload.
	const taxConfigs = build("taxConfigs", taxConfigSchema, (i, raw) => ({
		oldId: typeof raw.id === "string" ? raw.id : null,
		data: { ...i, userId },
	})) as Array<{ oldId: string | null; data: Json }>;

	const taxRecords = build(
		"taxRecords",
		{
			safeParse: (v: unknown) => {
				const r = (v ?? {}) as Json;
				const d = toDate(r.date);
				return taxRecordSchema.safeParse({
					...r,
					month: d.getUTCMonth() + 1,
					year: d.getUTCFullYear(),
				});
			},
		},
		(i) => {
			const { month, year, ...rest } = i as {
				month: number;
				year: number;
				taxConfigId?: string | null;
			};
			return {
				...rest,
				date: new Date(Date.UTC(year, month - 1, 1)),
				userId,
			};
		},
	) as Array<Json & { taxConfigId?: string | null }>;

	const income = build(
		"income",
		{
			safeParse: (v: unknown) => {
				const r = (v ?? {}) as Json;
				return incomeSchema.safeParse({
					...r,
					date: toDate(r.date).toISOString(),
				});
			},
		},
		(i) => {
			const { date, ...rest } = i as {
				date?: string;
				taxConfigId?: string | null;
			};
			return {
				...rest,
				date: date ? new Date(date) : new Date(),
				userId,
			};
		},
	) as Array<Json & { taxConfigId?: string | null }>;

	await prisma.$transaction(async (tx: Tx) => {
		if (replace) {
			// Delete in FK-safe order (records reference configs).
			await tx.taxRecord.deleteMany({ where: { userId } });
			await tx.income.deleteMany({ where: { userId } });
			await tx.taxConfig.deleteMany({ where: { userId } });
			await tx.expense.deleteMany({ where: { userId } });
			await tx.subscription.deleteMany({ where: { userId } });
			await tx.task.deleteMany({ where: { userId } });
			await tx.note.deleteMany({ where: { userId } });
			await tx.bookmark.deleteMany({ where: { userId } });
		}

		const createMany = async (
			delegate: { createMany(args: unknown): Promise<{ count: number }> },
			rows: unknown[],
			key: string,
		) => {
			if (rows.length === 0) {
				imported[key] = 0;
				return;
			}
			const res = await delegate.createMany({ data: rows });
			imported[key] = res.count;
		};

		await createMany(tx.bookmark, bookmarks, "bookmarks");
		await createMany(tx.note, notes, "notes");
		await createMany(tx.task, tasks, "tasks");
		await createMany(tx.subscription, subscriptions, "subscriptions");
		await createMany(tx.expense, expenses, "expenses");

		// Tax configs: reuse an existing same-named config (merge) or create a
		// new one, building the old->new id map for records.
		const configIdMap = new Map<string, string>();
		let configCount = 0;
		for (const { oldId, data: cfgData } of taxConfigs) {
			const name = (cfgData as { name: string }).name;
			const existing = await tx.taxConfig.findFirst({
				where: { userId, name },
			});
			const cfg =
				existing ??
				(await tx.taxConfig.create({
					data: cfgData as Prisma.TaxConfigUncheckedCreateInput,
				}));
			if (!existing) configCount++;
			if (oldId) configIdMap.set(oldId, cfg.id);
		}
		imported.taxConfigs = configCount;

		const remapConfig = <T extends Json & { taxConfigId?: string | null }>(
			r: T,
		) => {
			const { taxConfigId, ...rest } = r;
			const mapped =
				taxConfigId && configIdMap.has(taxConfigId)
					? configIdMap.get(taxConfigId)
					: null;
			return { ...rest, taxConfigId: mapped };
		};

		await createMany(tx.taxRecord, taxRecords.map(remapConfig), "taxRecords");
		await createMany(tx.income, income.map(remapConfig), "income");
	});

	return NextResponse.json({ imported, skipped });
}

export const POST = route(handler);
