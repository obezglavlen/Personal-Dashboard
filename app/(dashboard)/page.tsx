import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/shared/stat-card";
import {
  Bookmark, StickyNote, CheckSquare, CheckCircle2,
  Receipt, Calculator, FileText, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IncomeExpenseChart } from "./income-expense-chart";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [
    bookmarkCount,
    noteCount,
    taskCount,
    completedTasks,
    subscriptionCount,
    taxConfigCount,
    taxRecordCount,
  ] = await Promise.all([
    prisma.bookmark.count({ where: { userId } }),
    prisma.note.count({ where: { userId } }),
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: "done" } }),
    prisma.subscription.count({ where: { userId } }),
    prisma.taxConfig.count({ where: { userId } }),
    prisma.taxRecord.count({ where: { userId } }),
  ]);

  const recentBookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const recentTasks = await prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const completionRate = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Welcome back, {session!.user.name || "User"}.
        </p>
      </div>

      {/* Stat grid: 2 cols on phones (so they don't look lost as a single
          column), 2 on sm, 3 on lg, 4 on xl. xl still gets xl:grid-cols-4
          but xl:grid-cols-7 was reported in memory as the live value —
          only 6 StatCards here so go 2-2-3-3-4-6 = 6 spans; simpler to
          keep a clean responsive ramp. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Bookmarks" value={bookmarkCount} icon={Bookmark} description="Saved links" />
        <StatCard title="Notes" value={noteCount} icon={StickyNote} description="Across all tags" />
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

      <IncomeExpenseChart />

      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>
    </div>
  );
}
