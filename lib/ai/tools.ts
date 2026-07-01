import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentMonthRange } from "@/lib/budget";
import { daysUntil, nextRenewal, type Period } from "@/lib/subscriptions";
import {
	buildAccountData,
	buildBookmarkData,
	buildBudgetData,
	buildExpenseData,
	buildGoalData,
	buildNoteData,
	buildSubscriptionData,
	buildTaskData,
} from "@/lib/api/build-data";
import { accountSchema } from "@/lib/validations/account";
import { bookmarkSchema } from "@/lib/validations/bookmark";
import { budgetSchema } from "@/lib/validations/budget";
import { expenseSchema } from "@/lib/validations/expense";
import { goalSchema } from "@/lib/validations/goal";
import { noteSchema } from "@/lib/validations/note";
import { subscriptionSchema } from "@/lib/validations/subscription";
import { taskSchema } from "@/lib/validations/task";

/**
 * Read-only tools the chat agent uses to answer questions about the signed-in
 * user's dashboard data. Every tool is built by `buildTools(userId)` so the
 * `userId` is closed over and injected into each query — the model NEVER
 * supplies it, which keeps every read hard-scoped to the session user.
 *
 * Conventions:
 * - Prisma `Decimal` columns are converted to `number` before returning, since
 *   the model only understands JSON primitives.
 * - Monetary totals are grouped by currency (no FX is applied here). When the
 *   user wants a single-currency figure the model can call `getExchangeRates`
 *   and convert itself.
 * - Result rows are capped so a huge table can't blow the context window.
 */

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

const dateString = z
	.string()
	.describe("ISO date, e.g. 2026-06-01")
	.optional();

/** Sum `amount` per currency code → `{ USD: 123.45, EUR: 67.8 }`. */
function sumByCurrency(rows: { amount: number; currency: string }[]) {
	const out: Record<string, number> = {};
	for (const r of rows) out[r.currency] = (out[r.currency] ?? 0) + r.amount;
	return out;
}

/** Clamp a model-supplied limit into `[1, MAX_LIMIT]`, default `DEFAULT_LIMIT`. */
function clampLimit(limit?: number): number {
	if (!limit || limit < 1) return DEFAULT_LIMIT;
	return Math.min(limit, MAX_LIMIT);
}

export function buildTools(userId: string) {
	return {
		getExpenses: tool({
			description:
				"List the user's expenses, optionally filtered by date range and/or tag. Returns the rows plus totals grouped by currency. Use for spending questions.",
			inputSchema: z.object({
				from: dateString,
				to: dateString,
				tag: z
					.string()
					.describe("Only expenses carrying this tag (case-insensitive)")
					.optional(),
				limit: z.number().int().optional(),
			}),
			execute: async ({ from, to, tag, limit }) => {
				const rows = await prisma.expense.findMany({
					where: {
						userId,
						...(from || to
							? {
									date: {
										...(from ? { gte: new Date(from) } : {}),
										...(to ? { lte: new Date(to) } : {}),
									},
								}
							: {}),
						...(tag ? { tags: { has: tag } } : {}),
					},
					orderBy: { date: "desc" },
					take: clampLimit(limit),
					select: {
						name: true,
						amount: true,
						currency: true,
						date: true,
						tags: true,
					},
				});
				const expenses = rows.map((e) => ({
					name: e.name,
					amount: Number(e.amount),
					currency: e.currency,
					date: e.date.toISOString().slice(0, 10),
					tags: e.tags,
				}));
				return {
					count: expenses.length,
					totalsByCurrency: sumByCurrency(expenses),
					expenses,
				};
			},
		}),

		getBudgets: tool({
			description:
				"List the user's budgets (monthly spending caps) with how much has been spent against each this calendar month. Spent is grouped by currency and not FX-converted. Use to answer 'am I over budget?'.",
			inputSchema: z.object({}),
			execute: async () => {
				const { start, end } = currentMonthRange();
				const [budgets, monthExpenses] = await Promise.all([
					prisma.budget.findMany({
						where: { userId },
						select: {
							name: true,
							amount: true,
							currency: true,
							period: true,
							tags: true,
						},
					}),
					prisma.expense.findMany({
						where: { userId, date: { gte: start, lt: end } },
						select: { amount: true, currency: true, tags: true },
					}),
				]);
				return budgets.map((b) => {
					const tagSet = new Set(b.tags.map((t) => t.toLowerCase()));
					const matching = monthExpenses
						.filter(
							(e) =>
								tagSet.size === 0 ||
								e.tags.some((t) => tagSet.has(t.toLowerCase())),
						)
						.map((e) => ({
							amount: Number(e.amount),
							currency: e.currency,
						}));
					return {
						name: b.name,
						amount: Number(b.amount),
						currency: b.currency,
						period: b.period,
						tags: b.tags,
						spentThisMonthByCurrency: sumByCurrency(matching),
					};
				});
			},
		}),

		getSubscriptions: tool({
			description:
				"List the user's recurring subscriptions with their next renewal date and days until renewal. Includes the normalized monthly cost grouped by currency (annual plans divided by 12).",
			inputSchema: z.object({}),
			execute: async () => {
				const subs = await prisma.subscription.findMany({
					where: { userId },
					select: {
						name: true,
						price: true,
						period: true,
						startDate: true,
						currency: true,
						category: true,
					},
				});
				const ref = new Date();
				const items = subs.map((s) => {
					const price = Number(s.price);
					const next = nextRenewal(
						s.startDate.toISOString(),
						s.period as Period,
						ref,
					);
					return {
						name: s.name,
						price,
						currency: s.currency,
						period: s.period,
						category: s.category,
						nextRenewal: next.toISOString().slice(0, 10),
						daysUntilRenewal: daysUntil(next, ref),
						monthlyCost: s.period === "annual" ? price / 12 : price,
					};
				});
				return {
					count: items.length,
					monthlyCostByCurrency: sumByCurrency(
						items.map((i) => ({
							amount: i.monthlyCost,
							currency: i.currency,
						})),
					),
					subscriptions: items,
				};
			},
		}),

		getTasks: tool({
			description:
				"List the user's tasks, optionally filtered by status (todo/in-progress/done) or priority (low/medium/high). Returns due dates so you can reason about what's overdue or upcoming.",
			inputSchema: z.object({
				status: z.string().optional(),
				priority: z.string().optional(),
				limit: z.number().int().optional(),
			}),
			execute: async ({ status, priority, limit }) => {
				const rows = await prisma.task.findMany({
					where: {
						userId,
						...(status ? { status } : {}),
						...(priority ? { priority } : {}),
					},
					orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
					take: clampLimit(limit),
					select: {
						title: true,
						description: true,
						status: true,
						priority: true,
						dueDate: true,
					},
				});
				return rows.map((t) => ({
					title: t.title,
					description: t.description,
					status: t.status,
					priority: t.priority,
					dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
				}));
			},
		}),

		getNetWorth: tool({
			description:
				"List the user's financial accounts (cash, investments, liabilities) with balances, plus net worth totaled per currency. Negative balances are liabilities.",
			inputSchema: z.object({}),
			execute: async () => {
				const accounts = await prisma.financialAccount.findMany({
					where: { userId },
					select: { name: true, type: true, balance: true, currency: true },
				});
				const items = accounts.map((a) => ({
					name: a.name,
					type: a.type,
					balance: Number(a.balance),
					currency: a.currency,
				}));
				return {
					accounts: items,
					netWorthByCurrency: sumByCurrency(
						items.map((a) => ({ amount: a.balance, currency: a.currency })),
					),
				};
			},
		}),

		getGoals: tool({
			description:
				"List the user's savings goals with target, current amount, and percent progress.",
			inputSchema: z.object({}),
			execute: async () => {
				const goals = await prisma.goal.findMany({
					where: { userId },
					select: { name: true, target: true, current: true, currency: true },
				});
				return goals.map((g) => {
					const target = Number(g.target);
					const current = Number(g.current);
					return {
						name: g.name,
						target,
						current,
						currency: g.currency,
						percentComplete:
							target > 0 ? Math.round((current / target) * 100) : 0,
					};
				});
			},
		}),

		getTaxRecords: tool({
			description:
				"List the user's tax records (income/payments), optionally filtered by date range or type. Totals grouped by currency.",
			inputSchema: z.object({
				from: dateString,
				to: dateString,
				type: z.string().optional(),
				limit: z.number().int().optional(),
			}),
			execute: async ({ from, to, type, limit }) => {
				const rows = await prisma.taxRecord.findMany({
					where: {
						userId,
						...(type ? { type } : {}),
						...(from || to
							? {
									date: {
										...(from ? { gte: new Date(from) } : {}),
										...(to ? { lte: new Date(to) } : {}),
									},
								}
							: {}),
					},
					orderBy: { date: "desc" },
					take: clampLimit(limit),
					select: {
						type: true,
						amount: true,
						currency: true,
						date: true,
						description: true,
					},
				});
				const records = rows.map((r) => ({
					type: r.type,
					amount: r.amount === null ? null : Number(r.amount),
					currency: r.currency,
					date: r.date.toISOString().slice(0, 10),
					description: r.description,
				}));
				return {
					count: records.length,
					totalsByCurrency: sumByCurrency(
						records
							.filter((r) => r.amount !== null)
							.map((r) => ({ amount: r.amount as number, currency: r.currency })),
					),
					records,
				};
			},
		}),

		getNotes: tool({
			description:
				"Search the user's notes by a text query (matches title and content). Returns matching notes.",
			inputSchema: z.object({
				search: z.string().optional(),
				limit: z.number().int().optional(),
			}),
			execute: async ({ search, limit }) => {
				const rows = await prisma.note.findMany({
					where: {
						userId,
						...(search
							? {
									OR: [
										{ title: { contains: search, mode: "insensitive" } },
										{ content: { contains: search, mode: "insensitive" } },
									],
								}
							: {}),
					},
					orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
					take: clampLimit(limit),
					select: { title: true, content: true, tags: true, pinned: true },
				});
				return rows;
			},
		}),

		getBookmarks: tool({
			description:
				"List the user's bookmarks, optionally filtered by category.",
			inputSchema: z.object({
				category: z.string().optional(),
				limit: z.number().int().optional(),
			}),
			execute: async ({ category, limit }) => {
				const rows = await prisma.bookmark.findMany({
					where: { userId, ...(category ? { category } : {}) },
					orderBy: { createdAt: "desc" },
					take: clampLimit(limit),
					select: {
						title: true,
						url: true,
						description: true,
						category: true,
					},
				});
				return rows;
			},
		}),

		getExchangeRates: tool({
			description:
				"Get current currency exchange rates relative to `base`. rates[X] = units of X per 1 base, so to convert an amount in X into base, divide by rates[X]. Call this when the user wants figures combined into a single currency.",
			inputSchema: z.object({
				base: z
					.string()
					.describe("ISO 4217 base currency code, e.g. USD")
					.default("USD"),
			}),
			execute: async ({ base }) => {
				const code = base.toUpperCase();
				try {
					const res = await fetch(
						`https://api.frankfurter.dev/v2/rates?base=${encodeURIComponent(code)}`,
						{ next: { revalidate: 3600 } },
					);
					if (!res.ok) return { base: code, rates: {} };
					// v2 /rates returns rows of { date, base, quote, rate }.
					const rows = (await res.json()) as {
						quote: string;
						rate: number;
					}[];
					const rates: Record<string, number> = {};
					for (const r of rows) rates[r.quote] = r.rate;
					return { base: code, rates };
				} catch {
					return { base: code, rates: {} };
				}
			},
		}),

		// --- Write tools -----------------------------------------------------
		// Every create* tool carries `needsApproval: true`: the model proposes
		// the write, but the SDK pauses and surfaces an approval request to the
		// UI. `execute` (the actual DB write) only runs after the user approves
		// and the message is resubmitted. `userId` is injected by the build*Data
		// helpers from the closure — never accepted from the model — so writes
		// stay hard-scoped to the signed-in user, exactly like the read tools.
		createExpense: tool({
			description:
				"Create a new expense. Amounts are in the given 3-letter currency (defaults to the user's). `date` is an ISO date (defaults to today). `tags` are free-form; the first is treated as the category. Needs user approval before it is saved.",
			inputSchema: expenseSchema,
			needsApproval: true,
			execute: async (input) => {
				const row = await prisma.expense.create({
					data: buildExpenseData(input, userId),
				});
				return {
					id: row.id,
					name: row.name,
					amount: Number(row.amount),
					currency: row.currency,
					date: row.date.toISOString().slice(0, 10),
					tags: row.tags,
				};
			},
		}),

		createTask: tool({
			description:
				"Create a new task. `status` is todo|in_progress|done, `priority` is low|medium|high, `dueDate` is an optional ISO date. Needs user approval before it is saved.",
			inputSchema: taskSchema,
			needsApproval: true,
			execute: async (input) => {
				const row = await prisma.task.create({
					data: buildTaskData(input, userId),
				});
				return {
					id: row.id,
					title: row.title,
					status: row.status,
					priority: row.priority,
					dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
				};
			},
		}),

		createNote: tool({
			description:
				"Create a new note with a title, markdown content, optional tags, and pin flag. Needs user approval before it is saved.",
			inputSchema: noteSchema,
			needsApproval: true,
			execute: async (input) => {
				const row = await prisma.note.create({
					data: buildNoteData(input, userId),
				});
				return {
					id: row.id,
					title: row.title,
					tags: row.tags,
					pinned: row.pinned,
				};
			},
		}),

		createBookmark: tool({
			description:
				"Create a new bookmark from a URL and title, with an optional description and category. Needs user approval before it is saved.",
			inputSchema: bookmarkSchema,
			needsApproval: true,
			execute: async (input) => {
				const row = await prisma.bookmark.create({
					data: buildBookmarkData(input, userId),
				});
				return {
					id: row.id,
					title: row.title,
					url: row.url,
					category: row.category,
				};
			},
		}),

		createBudget: tool({
			description:
				"Create a monthly budget: a spending cap (`amount`) matched against expenses carrying any of `tags` (empty = all expenses). Needs user approval before it is saved.",
			inputSchema: budgetSchema,
			needsApproval: true,
			execute: async (input) => {
				const row = await prisma.budget.create({
					data: buildBudgetData(input, userId),
				});
				return {
					id: row.id,
					name: row.name,
					amount: Number(row.amount),
					currency: row.currency,
					period: row.period,
					tags: row.tags,
				};
			},
		}),

		createSubscription: tool({
			description:
				"Create a recurring subscription. `period` is monthly|annual, `startDate` is an optional ISO date, `autoExpense` auto-posts an expense on each renewal. Needs user approval before it is saved.",
			inputSchema: subscriptionSchema,
			needsApproval: true,
			execute: async (input) => {
				const row = await prisma.subscription.create({
					data: buildSubscriptionData(input, userId),
				});
				return {
					id: row.id,
					name: row.name,
					price: Number(row.price),
					currency: row.currency,
					period: row.period,
					startDate: row.startDate.toISOString().slice(0, 10),
				};
			},
		}),

		createGoal: tool({
			description:
				"Create a savings goal with a positive `target` and optional starting `current` amount. Needs user approval before it is saved.",
			inputSchema: goalSchema,
			needsApproval: true,
			execute: async (input) => {
				const row = await prisma.goal.create({
					data: buildGoalData(input, userId),
				});
				return {
					id: row.id,
					name: row.name,
					target: Number(row.target),
					current: Number(row.current),
					currency: row.currency,
				};
			},
		}),

		createFinancialAccount: tool({
			description:
				"Create a financial account for net worth. `type` is one of cash|checking|savings|investment|crypto|property|loan|credit|other. `balance` may be negative for liabilities. Needs user approval before it is saved.",
			inputSchema: accountSchema,
			needsApproval: true,
			execute: async (input) => {
				const row = await prisma.financialAccount.create({
					data: buildAccountData(input, userId),
				});
				return {
					id: row.id,
					name: row.name,
					type: row.type,
					balance: Number(row.balance),
					currency: row.currency,
				};
			},
		}),
	};
}
