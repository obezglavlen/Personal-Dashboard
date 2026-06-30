import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/shared/app-shell";
import { UserMenu } from "@/components/shared/user-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <AppShell
      headerRight={
        <UserMenu email={session.user.email!} name={session.user.name} />
      }
    >
      {children}
    </AppShell>
  );
}
