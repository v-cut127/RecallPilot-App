import { redirect } from "next/navigation";
import { getOrgContext, requireUser } from "@/lib/auth";
import { getShellData } from "@/lib/app-data";
import { AppShell } from "@/components/app/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const context = await getOrgContext();
  if (!context) redirect("/onboarding");
  const shell = await getShellData(context.organization.id);

  return (
    <AppShell
      user={{ id: context.user.id, email: context.user.email, fullName: context.user.fullName }}
      org={{ id: context.organization.id, name: context.organization.name, slug: context.organization.slug }}
      locations={context.locations.map((location) => ({ id: location.id, name: location.name, city: location.city }))}
      dueCount={shell.dueCount}
      unreadCount={shell.unreadCount}
      searchPatients={shell.searchPatients}
      notifications={shell.notifications}
    >
      {children}
    </AppShell>
  );
}
