import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/shared/stat-card";
import { Bookmark, StickyNote, CheckSquare, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [bookmarkCount, noteCount, taskCount, completedTasks] = await Promise.all([
    prisma.bookmark.count({ where: { userId } }),
    prisma.note.count({ where: { userId } }),
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: "done" } }),
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session!.user.name || "User"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Bookmarks" value={bookmarkCount} icon={Bookmark} />
        <StatCard title="Notes" value={noteCount} icon={StickyNote} />
        <StatCard title="Total Tasks" value={taskCount} icon={CheckSquare} />
        <StatCard title="Completed" value={completedTasks} icon={CheckCircle2} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Bookmarks</h2>
            <Link href="/bookmarks" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentBookmarks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookmarks yet</p>
            ) : (
              recentBookmarks.map((bm) => (
                <a
                  key={bm.id}
                  href={bm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md border p-3 transition-colors hover:bg-accent"
                >
                  <div className="font-medium">{bm.title}</div>
                  <div className="text-xs text-muted-foreground">{bm.url}</div>
                </a>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Tasks</h2>
            <Link href="/tasks" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet</p>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{task.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {task.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
