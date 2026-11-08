import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CircleDollarSign,
  MessageSquare,
  Sparkles,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { requireOrgContext } from "@/lib/auth";
import { formatCurrency, formatDate, formatNumber, getOverviewData, relativeDay, timeAgo } from "@/lib/app-data";
import { Metric, MetricStrip, PageHeader, Panel, PanelHeader, Sparkline } from "@/components/app/ui";
import { RevenueChart } from "@/components/app/revenue-chart";
import { UpcomingRecallsTable } from "@/components/app/overview-recalls";
import { NewCampaignButton } from "@/components/app/campaign-form";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const ACTIVITY_STYLES = {
  recall: { icon: Users, tone: "text-[#e3b341] bg-[#e3b341]/10" },
  message: { icon: MessageSquare, tone: "text-[#53d2e5] bg-[#53d2e5]/10" },
  reply: { icon: MessageSquare, tone: "text-[#8ed8ff] bg-[#006ec3]/15" },
  appointment: { icon: CalendarCheck2, tone: "text-[#5bd39a] bg-[#5bd39a]/10" },
  revenue: { icon: CircleDollarSign, tone: "text-[#5bd39a] bg-[#5bd39a]/10" },
} as const;

export default async function OverviewPage() {
  const context = await requireOrgContext();
  const data = await getOverviewData(context.organization.id);
  const firstName = context.user.fullName?.split(" ")[0] ?? context.user.email.split("@")[0] ?? "there";
  const today = new Date();
  const dueSpark = data.ranges["12m"].points.map((point) => point.value);
  const recoverySpark = data.ranges["12m"].points.map((point) => point.previous);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={context.organization.name}
        title={`${greeting()}, ${firstName}`}
        description={`${formatDate(today, "EEEE, d MMMM")} · Here's the state of recall operations across ${formatNumber(
          data.metrics.totalPatients
        )} patients.`}
        actions={
          <>
            <Link
              href="/app/import"
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line bg-white/[0.02] px-2.5 text-[12px] font-medium text-[#c2cde0] transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              <Upload className="size-3.5" />
              Import patients
            </Link>
            <NewCampaignButton />
          </>
        }
      />

      <MetricStrip>
        <Metric
          label="Total patients"
          value={formatNumber(data.metrics.totalPatients)}
          change={data.metrics.totalPatientsChange}
          changeLabel="vs last month"
          icon={<Users />}
          className="relative overflow-hidden"
        />
        <Metric
          label="Patients due for recall"
          value={formatNumber(data.metrics.duePatients)}
          changeLabel={`${formatNumber(data.metrics.overdueCount)} overdue · ${formatNumber(data.metrics.lapsedCount)} lapsed`}
          icon={<UserRound />}
        />
        <Metric
          label="Revenue recovered"
          value={formatCurrency(data.metrics.recovered)}
          change={data.metrics.recoveredChange}
          changeLabel="last 30 days"
          icon={<CircleDollarSign />}
        />
        <Metric
          label="Recall conversion"
          value={`${data.metrics.conversionRate}%`}
          change={data.metrics.conversionChange}
          changeSuffix=" pts"
          changeLabel="vs benchmark"
          icon={<CalendarCheck2 />}
        />
      </MetricStrip>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <Panel className="flex flex-col">
          <RevenueChart ranges={data.ranges} initialRange="3m" height="fill" className="flex-1" />
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">Recoveries</p>
              <p className="mt-1 tabular text-[14px] font-semibold text-ink">{data.metrics.recoveredCount30}</p>
              <p className="text-[10px] text-muted-foreground">last 30 days</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">Avg. recovery</p>
              <p className="mt-1 tabular text-[14px] font-semibold text-ink">{formatCurrency(data.metrics.avgRecovery)}</p>
              <p className="text-[10px] text-muted-foreground">per patient</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">Ready to contact</p>
              <p className="mt-1 tabular text-[14px] font-semibold text-ink">{formatNumber(data.metrics.duePatients)}</p>
              <p className="text-[10px] text-muted-foreground">in the recall queue</p>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader
            title="Recent activity"
            actions={
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#5bd39a]">
                <span className="size-1.5 rounded-full bg-[#5bd39a]" />
                Live
              </span>
            }
          />
          <div className="flex-1 divide-y divide-line/70">
            {data.recentActivity.slice(0, 6).map((item) => {
              const style = ACTIVITY_STYLES[item.kind];
              const Icon = style.icon;
              return (
                <div key={item.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[5px] ${style.tone}`}>
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium leading-snug text-[#dbe4f3]">{item.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {item.subject} · {item.detail}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {item.amount ? <p className="tabular text-[11px] font-medium text-[#5bd39a]">+{formatCurrency(item.amount)}</p> : null}
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">{timeAgo(item.occurredAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-line bg-[#53d2e5]/[0.025] p-3.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-[#53d2e5]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7fd8e7]">AI insight</p>
            </div>
            <p className="mt-1.5 text-[12px] font-medium text-[#dbe4f3]">{data.insight.headline}</p>
            <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{data.insight.body}</p>
            <Link
              href="/app/assistant"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#8ed8ff] transition-colors hover:text-[#53d2e5]"
            >
              Open AI assistant <ArrowRight className="size-3" />
            </Link>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <Panel>
          <PanelHeader
            title="Upcoming recalls"
            description="Patients with an active recall date, ordered by urgency."
            actions={
              <Link
                href="/app/patients?status=needs_recall"
                className="inline-flex h-6 items-center gap-1 rounded-[5px] px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-ink"
              >
                View all <ArrowRight className="size-3" />
              </Link>
            }
          />
          <UpcomingRecallsTable
            rows={data.upcomingRecalls.map((row) => ({
              id: row.patient.id,
              name: row.patient.name,
              phone: row.patient.phone,
              email: row.patient.email,
              lastVisitAt: row.patient.lastVisitAt,
              recallDue: row.patient.recallDue,
              status: row.patient.recallStatus,
              campaign: row.campaign,
              contact: row.contact,
            }))}
          />
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Recall pipeline" description="Modeled conversion across the current audience." />
            <div className="space-y-3 px-4 py-3.5">
              {[
                { label: "Due for outreach", value: data.metrics.duePatients, pct: 100 },
                { label: "Contacted", value: Math.round(data.metrics.duePatients * 0.58), pct: 58 },
                { label: "Responded", value: Math.round(data.metrics.duePatients * 0.23), pct: 23 },
                { label: "Booked", value: Math.round(data.metrics.duePatients * 0.12), pct: 12 },
              ].map((stage) => (
                <div key={stage.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{stage.label}</span>
                    <span className="tabular font-medium text-[#c5d2e8]">
                      {formatNumber(stage.value)} <span className="text-muted-foreground/70">· {stage.pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full bg-[#2f8fe0]" style={{ width: `${stage.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="At a glance" />
            <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">Recovery trend</p>
                <div className="mt-1 flex items-center gap-2">
                  <Sparkline values={recoverySpark} width={92} height={26} />
                  <span className="tabular text-[11px] font-medium text-[#5bd39a]">
                    {data.ranges["12m"].changePct >= 0 ? "+" : ""}
                    {data.ranges["12m"].changePct}%
                  </span>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">Due curve</p>
                <div className="mt-1 flex items-center gap-2">
                  <Sparkline values={dueSpark} width={92} height={26} />
                  <span className="tabular text-[11px] font-medium text-[#53d2e5]">{relativeDay(data.upcomingRecalls[0]?.patient.recallDue ?? null)}</span>
                </div>
              </div>
            </div>
            <Link
              href="/app/analytics"
              className="flex h-9 items-center justify-between px-4 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-ink"
            >
              Open analytics
              <ArrowRight className="size-3" />
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
