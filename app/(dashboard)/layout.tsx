import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/shared/app-shell";
import { ThemeToggle } from "@/components/shared/theme-toggle";
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
        <>
          <ThemeToggle />
          <UserMenu email={session.user.email!} name={session.user.name} />
        </>
      }
    >
      {children}
    </AppShell>
  );
}