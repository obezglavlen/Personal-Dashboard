import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import {
	serializeExpense,
	serializeIncome,
	serializeSubscription,
	serializeTaxConfig,
	serializeTaxRecord,
} from "@/lib/api/resources";
import { requireUserId } from "@/lib/api/session";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/export/csv";

export const EXPORT_VERSION = 1;

/** Version 1 exports only these eight resources; it is NOT a complete backup. */
export const BACKUP_SCOPE = {
	partial: true,
	included: [
		"bookmarks",
		"notes",
		"tasks",
		"subscriptions",
		"taxConfigs",
		"taxRecords",
		"income",
		"expenses",
	],
	omitted: [
		"budgets",
		"financialAccounts",
		"goals",
		"recurringTransactions",
		"calendarEvents",
		"userSettings",
		"tags",
		"netWorthSnapshots",
	],
	replaceDeletes: [
		"bookmarks",
		"notes",
		"tasks",
		"subscriptions",
		"taxConfigs",
		"taxRecords",
		"income",
		"expenses",
	],
	importLimitations: [
		"Import creates new IDs and created/updated timestamps, not a byte-for-byte restore.",
		"Subscription lastPostedAt is not restored; automatic expense posting may repeat after import.",
		"Tax record dates are normalized to the first of their month on import.",
	],
} as const;

/**
 * Gather the eight v1 resources, keyed by the same resource names used
 * in the import envelope. Custom-serialized models reuse the API serializers so
 * the export matches what the REST endpoints return; the rest export raw rows
 * (Dates become ISO strings via JSON serialization).
 */
async function collect(userId: string) {
	const [
		bookmarks,
		notes,
		tasks,
		subscriptions,
		taxConfigs,
		taxRecords,
		income,
		expenses,
	] = await Promise.all([
		prisma.bookmark.findMany({ where: { userId } }),
		prisma.note.findMany({ where: { userId } }),
		prisma.task.findMany({ where: { userId } }),
		prisma.subscription.findMany({ where: { userId } }),
		prisma.taxConfig.findMany({ where: { userId } }),
		prisma.taxRecord.findMany({
			where: { userId },
			include: { taxConfig: true },
		}),
		prisma.income.findMany({
			where: { userId },
			include: { taxConfig: true },
		}),
		prisma.expense.findMany({ where: { userId } }),
	]);

	return {
		bookmarks,
		notes,
		tasks,
		subscriptions: subscriptions.map(serializeSubscription),
		taxConfigs: taxConfigs.map(serializeTaxConfig),
		taxRecords: taxRecords.map(serializeTaxRecord),
		income: income.map(serializeIncome),
		expenses: expenses.map(serializeExpense),
	} as Record<string, Array<Record<string, unknown>>>;
}

async function handler(req: Request): Promise<Response> {
	const userId = await requireUserId();
	const url = new URL(req.url);
	const format = url.searchParams.get("format");
	const resource = url.searchParams.get("resource");

	const data = await collect(userId);

	// Per-resource CSV download.
	if (format === "csv") {
		if (!resource || !(resource in data)) {
			return NextResponse.json(
				{ error: "Unknown or missing resource for CSV export" },
				{ status: 400 },
			);
		}
		const csv = toCsv(data[resource]);
		return new NextResponse(csv, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="home-dashboard-${resource}.csv"`,
			},
		});
	}

	// Full JSON bundle.
	const bundle = {
		version: EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		scope: BACKUP_SCOPE,
		data,
	};
	return new NextResponse(JSON.stringify(bundle, null, 2), {
		headers: {
			"Content-Type": "application/json",
			"Content-Disposition":
				'attachment; filename="home-dashboard-export.json"',
		},
	});
}

export const GET = route(handler);
