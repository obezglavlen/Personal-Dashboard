import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/shared/app-shell";
import { UserMenu } from "@/components/shared/user-menu";
import { prisma } from "@/lib/db";
import { resolveNavOrder } from "@/lib/nav/items";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { navLayout: true },
  });
  const navOrder = resolveNavOrder(settings?.navLayout);

  return (
    <AppShell
      navOrder={navOrder}
      headerRight={
        <UserMenu email={session.user.email!} name={session.user.name} />
      }
    >
      {children}
    </AppShell>
  );
}
