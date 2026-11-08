import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleDollarSign, Percent, Target, Users } from "lucide-react";
import { requireOrgContext } from "@/lib/auth";
import { formatCurrency, formatDate, formatNumber, getRevenueData } from "@/lib/app-data";
import { formatPercent } from "@/lib/format";
import { Avatar, Bar, Metric, MetricStrip, PageHeader, Panel, PanelHeader, RecallBadge, SectionLabel } from "@/components/app/ui";
import { RevenueChart, type ChartRange } from "@/components/app/revenue-chart";
import { revokeAuditAction } from "@/app/app/actions";

export const metadata = { title: "Revenue recovery" };
export const dynamic = "force-dynamic";

function rangeFor(key: "3m" | "12m", points: Array<{ label: string; fullLabel: string; value: number; previous: number }>): ChartRange {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const previousTotal = points.reduce((sum, point) => sum + point.previous, 0);
  return {
    key,
    label: key === "3m" ? "3 months" : "12 months",
    points,
    total,
    previousTotal,
    changePct: previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 1000) / 10 : 0,
  };
}

const STAGE_STYLES: Record<string, string> = {
  Identified: "border-line bg-white/[0.03] text-[#a7b2c7]",
  Contacted: "border-[#53d2e5]/20 bg-[#53d2e5]/10 text-[#a9e7f1]",
  Replied: "border-[#2f8fe0]/25 bg-[#2f8fe0]/10 text-[#8ed8ff]",
  Booked: "border-[#4cc38a]/20 bg-[#4cc38a]/10 text-[#83e0b3]",
};

export default async function RevenuePage() {
  const context = await requireOrgContext();
  const data = await getRevenueData(context.organization.id);
  const ranges = {
    "3m": rangeFor("3m", data.series.slice(-3)),
    "12m": rangeFor("12m", data.series),
  };
  const maxTreatment = Math.max(1, ...data.byTreatment.map((item) => item.value));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Revenue recovery"
        description="Open recall opportunities, attributed recovery and the value of the current queue."
        actions={
          <Link
            href="/app/patients?status=needs_recall"
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#006ec3] px-2.5 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors hover:bg-[#0a7bd4]"
          >
            Review recall queue <ArrowRight className="size-3.5" />
          </Link>
        }
      />

      <MetricStrip>
        <Metric
          label="Recovered · 90 days"
          value={formatCurrency(data.kpis.recovered90)}
          change={data.kpis.recoveredChange}
          changeLabel="vs previous 90 days"
          icon={<CircleDollarSign />}
        />
        <Metric label="Open opportunities" value={formatNumber(data.kpis.openOpportunities)} changeLabel="patients in the recall queue" icon={<Users />} />
        <Metric label="Pipeline value" value={formatCurrency(data.kpis.pipelineValue)} changeLabel="estimated production" icon={<Target />} />
        <Metric label="Recovery rate" value={formatPercent(data.kpis.recoveryRate)} changeLabel={`${formatCurrency(data.kpis.avgRecovery)} avg. recovery`} icon={<Percent />} />
      </MetricStrip>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <Panel className="flex flex-col">
          <RevenueChart ranges={ranges} allowedRanges={["3m", "12m"]} initialRange="3m" height="fill" className="flex-1" />
        </Panel>

        <div className="space-y-4">
          {data.latestAudit ? (
            <Panel>
              <PanelHeader
                title="Latest audit"
                description={`Completed ${data.latestAudit.completedAt ? formatDate(data.latestAudit.completedAt, "d MMM yyyy") : "recently"}`}
                actions={
                  <div className="flex items-center gap-2">
                    <Link href={`/audit/${data.latestAudit.token}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8ed8ff] hover:text-[#53d2e5]">
                      Open <ArrowUpRight className="size-3" />
                    </Link>
                    {data.latestAudit.revokedAt || data.latestAudit.expiresAt.getTime() <= Date.now() ? (
                      <span className="text-[10px] text-muted-foreground">Expired or revoked</span>
                    ) : (
                      <form action={revokeAuditAction}>
                        <input type="hidden" name="auditId" value={data.latestAudit.id} />
                        <button
                          type="submit"
                          className="inline-flex h-6 items-center rounded-[4px] border border-line px-2 text-[10px] font-medium text-[#c2cde0] transition-colors hover:bg-white/[0.05] hover:text-ink"
                        >
                          Revoke link
                        </button>
                      </form>
                    )}
                  </div>
                }
              />
              <div className="grid grid-cols-3 divide-x divide-line">
                <div className="px-3 py-3">
                  <SectionLabel>Overdue</SectionLabel>
                  <p className="mt-1 tabular text-[16px] font-semibold text-ink">{formatNumber(data.latestAudit.overdue)}</p>
                </div>
                <div className="px-3 py-3">
                  <SectionLabel>Due 30d</SectionLabel>
                  <p className="mt-1 tabular text-[16px] font-semibold text-ink">{formatNumber(data.latestAudit.dueNext30)}</p>
                </div>
                <div className="px-3 py-3">
                  <SectionLabel>At risk</SectionLabel>
                  <p className="mt-1 tabular text-[13px] font-semibold text-ink">{formatCurrency(data.latestAudit.atRisk)}</p>
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel>
            <PanelHeader title="Recent recoveries" description="Attributed to recall outreach." />
            <div className="divide-y divide-line/70">
              {data.recentRecoveries.slice(0, 6).map((recovery) => (
                <div key={`${recovery.patientId}-${recovery.date.toISOString()}`} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar name={recovery.patientName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-[#dbe4f3]">{recovery.patientName}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(recovery.date, "d MMM yyyy")}</p>
                    </div>
                  </div>
                  <span className="tabular shrink-0 text-[11px] font-medium text-[#83e0b3]">+{formatCurrency(recovery.amount)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <Panel>
          <PanelHeader title="Recovery pipeline" description="Highest-value patients currently due for recall." />
          <div className="overflow-x-auto app-scroll">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
                  <th className="w-[26%] py-2 pl-4 pr-2 font-medium">Patient</th>
                  <th className="w-[15%] px-2 py-2 font-medium">Stage</th>
                  <th className="w-[12%] px-2 py-2 font-medium">Recall due</th>
                  <th className="w-[12%] px-2 py-2 font-medium">Value</th>
                  <th className="w-[13%] px-2 py-2 font-medium">Probability</th>
                  <th className="w-[14%] px-2 py-2 font-medium">Expected</th>
                  <th className="w-[8%] py-2 pl-2 pr-4 text-right font-medium">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.pipeline.map((item) => (
                  <tr key={item.patient.id} className="border-b border-line/60 last:border-0 hover:bg-white/[0.018]">
                    <td className="py-2.5 pl-4 pr-2">
                      <Link href={`/app/patients/${item.patient.id}`} className="flex min-w-0 items-center gap-2">
                        <Avatar name={item.patient.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-medium text-[#dbe4f3]">{item.patient.name}</span>
                          <span className="block text-[10px] text-muted-foreground">{item.patient.treatmentLabel}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className={`inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[10px] font-medium ${STAGE_STYLES[item.stage]}`}>
                        {item.stage}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[11px] text-muted-foreground">
                      {item.patient.recallDue ? formatDate(item.patient.recallDue, "d MMM") : "—"}
                    </td>
                    <td className="tabular px-2 py-2.5 text-[12px] text-[#c5d2e8]">{formatCurrency(item.value)}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="tabular text-[11px] text-[#c5d2e8]">{item.probability}%</span>
                        <span className="h-1 w-10 overflow-hidden rounded-full bg-white/[0.06]">
                          <span className="block h-full rounded-full bg-[#2f8fe0]" style={{ width: `${item.probability}%` }} />
                        </span>
                      </div>
                    </td>
                    <td className="tabular px-2 py-2.5 text-[12px] text-[#83e0b3]">{formatCurrency(item.expected)}</td>
                    <td className="py-2.5 pl-2 pr-4 text-right">
                      <Link href={`/app/patients/${item.patient.id}`} aria-label={`Open ${item.patient.name}`} className="inline-flex size-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-white/[0.05] hover:text-ink">
                        <ArrowRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Opportunity by treatment" />
            <div className="space-y-3 px-4 py-4">
              {data.byTreatment.map((item) => (
                <div key={item.treatment}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="flex items-center gap-2 tabular">
                      <span className="text-[#c5d2e8]">{formatCurrency(item.value)}</span>
                      <span className="text-muted-foreground/70">{item.open}</span>
                    </span>
                  </div>
                  <Bar value={item.value} max={maxTreatment} tone={item.treatment === "hygiene" ? "cyan" : "blue"} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Patient snapshot" description="Top open recall patients." />
            <div className="divide-y divide-line/70">
              {data.pipeline.slice(0, 5).map((item) => (
                <Link key={item.patient.id} href={`/app/patients/${item.patient.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-white/[0.018]">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-[#dbe4f3]">{item.patient.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.patient.recallStatus.replace("_", " ")}</p>
                  </div>
                  <RecallBadge status={item.patient.recallStatus} />
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
