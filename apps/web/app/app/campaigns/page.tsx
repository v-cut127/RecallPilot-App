import Link from "next/link";
import { CircleDollarSign, Megaphone, Send, Users } from "lucide-react";
import { requireOrgContext } from "@/lib/auth";
import { formatCurrency, formatNumber, getCampaigns } from "@/lib/app-data";
import { formatPercent } from "@/lib/format";
import { Metric, MetricStrip, PageHeader, Panel } from "@/components/app/ui";
import { CampaignsTable } from "@/components/app/campaigns-table";
import { NewCampaignButton } from "@/components/app/campaign-form";

export const metadata = { title: "Recall campaigns" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "all", label: "All campaigns" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "paused", label: "Paused" },
];

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireOrgContext();
  const params = await searchParams;
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const campaigns = await getCampaigns(context.organization.id);

  const counts = {
    all: campaigns.length,
    active: campaigns.filter((campaign) => campaign.status === "active").length,
    scheduled: campaigns.filter((campaign) => campaign.status === "scheduled").length,
    paused: campaigns.filter((campaign) => campaign.status === "paused").length,
  };
  const filtered = statusParam && statusParam !== "all" ? campaigns.filter((campaign) => campaign.status === statusParam) : campaigns;

  const totalContacted = campaigns.reduce((sum, campaign) => sum + campaign.contacted, 0);
  const totalResponses = campaigns.reduce((sum, campaign) => sum + campaign.responses, 0);
  const totalRecovered = campaigns.reduce((sum, campaign) => sum + campaign.recovered, 0);
  const averageResponse = totalContacted > 0 ? Math.round((totalResponses / totalContacted) * 1000) / 10 : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Recall campaigns"
        description="Sequenced outreach for each recall rule, with the audience and recovery attributed to it."
        actions={<NewCampaignButton />}
      />

      <MetricStrip>
        <Metric label="Active campaigns" value={counts.active} changeLabel={`${counts.all} total rules`} icon={<Megaphone />} />
        <Metric label="Patients targeted" value={formatNumber(campaigns.reduce((sum, campaign) => sum + campaign.targetCount, 0))} changeLabel="in current recall window" icon={<Users />} />
        <Metric label="Response rate" value={formatPercent(averageResponse)} changeLabel="across all sequences" icon={<Send />} />
        <Metric label="Revenue recovered" value={formatCurrency(totalRecovered)} changeLabel="attributed to campaigns" icon={<CircleDollarSign />} />
      </MetricStrip>

      <Panel>
        <div className="flex h-10 items-center gap-1 overflow-x-auto border-b border-line px-2 app-scroll">
          {FILTERS.map((filter) => {
            const active = (statusParam ?? "all") === filter.value;
            const query = filter.value === "all" ? "" : `?status=${filter.value}`;
            return (
              <Link
                key={filter.value}
                href={`/app/campaigns${query}`}
                className={`relative -mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b px-2 text-[12px] font-medium transition-colors ${
                  active ? "border-[#53d2e5] text-ink" : "border-transparent text-muted-foreground hover:text-ink"
                }`}
              >
                {filter.label}
                <span className="rounded-[4px] bg-white/[0.05] px-1 text-[10px] tabular text-muted-foreground">
                  {counts[filter.value as keyof typeof counts].toLocaleString("en-US")}
                </span>
              </Link>
            );
          })}
        </div>

        <CampaignsTable
          rows={filtered.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            treatmentLabel: campaign.treatmentLabel,
            status: campaign.status,
            active: campaign.active,
            targetCount: campaign.targetCount,
            contacted: campaign.contacted,
            responseRate: campaign.responseRate,
            bookings: campaign.bookings,
            recovered: campaign.recovered,
            intervalMonths: campaign.intervalMonths,
          }))}
        />

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[13px] font-medium text-ink">No campaigns in this state</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Create a campaign to start sequencing recall outreach.</p>
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-[13px] font-semibold text-ink">How campaign attribution works</h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Audience counts come from the live patient recall window. Contacted, response and booking estimates use channel consent
              and the sequence cadence.
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">Sequence</p>
              <p className="mt-1 text-[12px] text-[#c7c7cd]">3 touches</p>
              <p className="text-[10px] text-muted-foreground">Day 0 · 7 · 21</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">Best channel</p>
              <p className="mt-1 text-[12px] text-[#c7c7cd]">SMS first</p>
              <p className="text-[10px] text-muted-foreground">Email fallback</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">Quiet hours</p>
              <p className="mt-1 text-[12px] text-[#c7c7cd]">08:00–19:00</p>
              <p className="text-[10px] text-muted-foreground">Local time</p>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[13px] font-semibold text-ink">Campaign guardrails</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Consent and opt-out rules apply to every send.</p>
            </div>
            <Link href="/app/settings" className="text-[11px] font-medium text-muted-foreground hover:text-ink">
              Manage
            </Link>
          </div>
          <div className="space-y-2.5 px-4 py-3 text-[11px] text-muted-foreground">
            <p className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#4cc38a]" /> Only patients with explicit channel consent are contacted.</p>
            <p className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#4cc38a]" /> Opt-outs are honoured before every message.</p>
            <p className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#4cc38a]" /> Recall revenue is attributed to the campaign that booked the visit.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
