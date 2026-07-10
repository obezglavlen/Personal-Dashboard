import {
	ArrowRight,
	Bookmark,
	Calculator,
	CheckSquare,
	Coins,
	FileText,
	Receipt,
	StickyNote,
} from "lucide-react";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";
import { StatCard } from "@/components/shared/stat-card";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { resolveLayout } from "@/lib/dashboard/widgets";
import { prisma } from "@/lib/db";
import { BudgetWidget } from "./budget-widget";
import { DashboardGrid } from "./dashboard-grid";
import { DueTasksWidget } from "./due-tasks-widget";
import { IncomeExpenseChart } from "./income-expense-chart";
import { NetWorthWidget } from "./net-worth-widget";
import {
	LastExpensesWidget,
	LastIncomeWidget,
	LastTaxesWidget,
} from "./recent-transactions-widgets";
import { RenewalsWidget } from "./renewals-widget";
import { TotalNetWidget } from "./total-net-widget";
import { UpcomingEventsWidget } from "./upcoming-events-widget";

export default async function DashboardPage() {
	// Guard here too, not just in the layout: layout and page render in parallel
	// in the App Router, so a null session (e.g. an iOS standalone PWA launched
	// with no cookie — installed apps use a separate cookie jar from Safari)
	// would hit `session!.user.id` and throw a 500 before the layout's redirect
	// wins. Redirecting here turns that crash into a clean login bounce.
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) redirect("/login");
	const userId = session.user.id;

	// Cache the whole aggregate in the Next Data Cache so rapid reloads don't
	// re-run these ~10 queries against the DB every time. Keyed by userId with a
	// short TTL: within the window a reload serves from cache, after it the
	// counts refresh. Time-based (not tag-based) invalidation on purpose — these
	// are read-mostly summary numbers, so a brief staleness after a write
	// elsewhere is fine, and it avoids coupling to Next 16's tag-revalidation
	// API. Selects are trimmed to the rendered fields to keep the cached payload
	// lean and free of Date values.
	const loadDashboardData = unstable_cache(
		async (uid: string) => {
			const [
				bookmarkCount,
				noteCount,
				taskCount,
				completedTasks,
				subscriptionCount,
				taxConfigCount,
				taxRecordCount,
				incomeCount,
				settings,
			] = await Promise.all([
				prisma.bookmark.count({ where: { userId: uid } }),
				prisma.note.count({ where: { userId: uid } }),
				prisma.task.count({ where: { userId: uid } }),
				prisma.task.count({ where: { userId: uid, status: "done" } }),
				prisma.subscription.count({ where: { userId: uid } }),
				prisma.taxConfig.count({ where: { userId: uid } }),
				prisma.taxRecord.count({ where: { userId: uid } }),
				prisma.income.count({ where: { userId: uid } }),
				prisma.userSettings.findUnique({ where: { userId: uid } }),
			]);
			const recentBookmarks = await prisma.bookmark.findMany({
				where: { userId: uid },
				orderBy: { createdAt: "desc" },
				take: 5,
				select: { id: true, url: true, title: true },
			});
			const recentTasks = await prisma.task.findMany({
				where: { userId: uid },
				orderBy: { createdAt: "desc" },
				take: 5,
				select: { id: true, title: true, status: true },
			});
			return {
				bookmarkCount,
				noteCount,
				taskCount,
				completedTasks,
				subscriptionCount,
				taxConfigCount,
				taxRecordCount,
				incomeCount,
				dashboardLayout: settings?.dashboardLayout ?? null,
				recentBookmarks,
				recentTasks,
			};
		},
		["dashboard-aggregate", userId],
		{ revalidate: 15 },
	);

	const {
		bookmarkCount,
		noteCount,
		taskCount,
		completedTasks,
		subscriptionCount,
		taxConfigCount,
		taxRecordCount,
		incomeCount,
		dashboardLayout,
		recentBookmarks,
		recentTasks,
	} = await loadDashboardData(userId);

	const { order, hidden } = resolveLayout(dashboardLayout);

	const completionRate =
		taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

	// Each widget's content is rendered here (server-side, where the data lives)
	// and handed to the client grid as a slot keyed by widget id. The grid only
	// arranges/toggles these nodes — it never re-fetches.
	const slots: Record<string, ReactNode> = {
		stats: (
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
				<StatCard
					title="Bookmarks"
					value={bookmarkCount}
					icon={Bookmark}
					description="Saved links"
				/>
				<StatCard
					title="Notes"
					value={noteCount}
					icon={StickyNote}
					description="Across all tags"
				/>
				<StatCard
					title="Tasks"
					value={`${completedTasks} / ${taskCount}`}
					icon={CheckSquare}
					description={`${completionRate}% complete`}
				/>
				<StatCard
					title="Subscriptions"
					value={subscriptionCount}
					icon={Receipt}
					description="Tracked recurring"
				/>
				<StatCard
					title="Income"
					value={incomeCount}
					icon={Coins}
					description="Entries"
				/>
				<StatCard
					title="Tax Types"
					value={taxConfigCount}
					icon={Calculator}
					description="Configured"
				/>
				<StatCard
					title="Tax Records"
					value={taxRecordCount}
					icon={FileText}
					description="All time"
				/>
			</div>
		),
		"net-worth": <NetWorthWidget />,
		"total-net": <TotalNetWidget />,
		"income-expense": <IncomeExpenseChart />,
		"budget-status": <BudgetWidget />,
		"last-expenses": <LastExpensesWidget />,
		"last-income": <LastIncomeWidget />,
		"last-taxes": <LastTaxesWidget />,
		"upcoming-renewals": <RenewalsWidget />,
		"due-tasks": <DueTasksWidget />,
		"upcoming-events": <UpcomingEventsWidget />,
		"recent-bookmarks": (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<div>
						<CardTitle>Recent Bookmarks</CardTitle>
						<CardDescription>Your latest saved links</CardDescription>
					</div>
					<Link
						href="/bookmarks"
						className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
					>
						View all <ArrowRight className="h-3 w-3" />
					</Link>
				</CardHeader>
				<CardContent>
					{recentBookmarks.length === 0 ? (
						<p className="text-sm text-muted-foreground">No bookmarks yet.</p>
					) : (
						<ul className="space-y-2">
							{recentBookmarks.map((bm) => (
								<li key={bm.id}>
									<a
										href={bm.url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex flex-col gap-0.5 rounded-md border border-border p-3 transition-colors hover:bg-accent"
									>
										<span className="text-sm font-medium">{bm.title}</span>
										<span className="truncate text-xs text-muted-foreground">
											{bm.url}
										</span>
									</a>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		),
		"recent-tasks": (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<div>
						<CardTitle>Recent Tasks</CardTitle>
						<CardDescription>Your latest activity</CardDescription>
					</div>
					<Link
						href="/tasks"
						className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
					>
						View all <ArrowRight className="h-3 w-3" />
					</Link>
				</CardHeader>
				<CardContent>
					{recentTasks.length === 0 ? (
						<p className="text-sm text-muted-foreground">No tasks yet.</p>
					) : (
						<ul className="space-y-2">
							{recentTasks.map((task) => (
								<li
									key={task.id}
									className="flex items-center justify-between rounded-md border border-border p-3"
								>
									<span className="text-sm font-medium">{task.title}</span>
									<span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
										{task.status.replace("_", " ")}
									</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		),
	};

	return (
		<div className="space-y-6 sm:space-y-8">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
					Dashboard
				</h1>
				<p className="text-sm text-muted-foreground sm:text-base">
					Welcome back, {session.user.name || "User"}.
				</p>
			</div>

			<DashboardGrid
				slots={slots}
				initialOrder={order}
				initialHidden={[...hidden]}
			/>
		</div>
	);
}
