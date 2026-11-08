import { requireOrgContext } from "@/lib/auth";
import { getCampaigns, getOverviewData, getRevenueData } from "@/lib/app-data";
import { AssistantView } from "@/components/app/assistant-view";

export const metadata = { title: "AI assistant" };
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const context = await requireOrgContext();
  const [overview, campaigns, revenue] = await Promise.all([
    getOverviewData(context.organization.id),
    getCampaigns(context.organization.id),
    getRevenueData(context.organization.id),
  ]);

  return (
    <AssistantView
      context={{
        userName: context.user.fullName ?? context.user.email.split("@")[0] ?? "there",
        totalPatients: overview.metrics.totalPatients,
        duePatients: overview.metrics.duePatients,
        overdue: overview.metrics.overdueCount,
        lapsed: overview.metrics.lapsedCount,
        recovered: overview.metrics.recovered,
        conversionRate: overview.metrics.conversionRate,
        insightHeadline: overview.insight.headline,
        insightBody: overview.insight.body,
        patients: overview.upcomingRecalls.map((row) => ({
          id: row.patient.id,
          name: row.patient.name,
          firstName: row.patient.firstName,
          status: row.patient.recallStatus,
          recallDue: row.patient.recallDue,
          treatmentLabel: row.patient.treatmentLabel,
          locationName: row.patient.locationName,
        })),
        campaigns: campaigns.map((campaign) => ({
          name: campaign.name,
          status: campaign.status,
          targetCount: campaign.targetCount,
          responseRate: campaign.responseRate,
          recovered: campaign.recovered,
        })),
        pendingValue: revenue.kpis.pipelineValue,
      }}
    />
  );
}
