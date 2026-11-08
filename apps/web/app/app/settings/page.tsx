import { requireOrgContext } from "@/lib/auth";
import { getSettingsData } from "@/lib/app-data";
import { PageHeader } from "@/components/app/ui";
import { SettingsView } from "@/components/app/settings-view";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await requireOrgContext();
  const data = await getSettingsData(context.organization.id);
  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Workspace configuration, recall rules, notifications, team access and data retention."
      />
      <SettingsView
        data={data}
        user={{ name: context.user.fullName ?? context.user.email, email: context.user.email }}
        role={context.membership.role}
        retention={{
          leadHours: Number(process.env.LEAD_RAW_RETENTION_HOURS ?? 24),
          orgHours: Number(process.env.ORG_RAW_RETENTION_HOURS ?? 168),
          rowHours: Number(process.env.LEAD_ROW_RETENTION_HOURS ?? 24),
          linkDays: Number(process.env.AUDIT_LINK_TTL_DAYS ?? 30),
        }}
      />
    </div>
  );
}
