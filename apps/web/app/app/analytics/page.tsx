import { CalendarCheck2, CircleDollarSign, Percent, TrendingUp } from "lucide-react";
import { requireOrgContext } from "@/lib/auth";
import { formatCurrency, formatNumber, getAnalyticsData } from "@/lib/app-data";
import { formatPercent } from "@/lib/format";
import { Bar, Metric, MetricStrip, PageHeader, Panel, PanelHeader, SectionLabel } from "@/components/app/ui";
import { AnalyticsCharts } from "@/components/app/analytics-charts";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const BUCKET_TONES: Record<string, string> = {
  cyan: "bg-[#53d2e5]",
  amber: "bg-[#e3b341]",
  red: "bg-[#f2777a]",
  muted: "bg-[#48566f]",
};

export default async function AnalyticsPage() {
  const context = await requireOrgContext();
  const data = await getAnalyticsData(context.organization.id);
  const maxTreatment = Math.max(1, ...data.byTreatment.map((item) => item.recovered));
  const maxBucket = Math.max(1, ...data.recallBuckets.map((bucket) => bucket.value));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Recall performance, recovered production and patient coverage across the practice."
      />

      <MetricStrip>
        <Metric
          label="Recovered · 12 months"
          value={formatCurrency(data.kpis.recovered12m)}
          change={data.kpis.recoveredChange}
          changeLabel="vs previous 90 days"
          icon={<CircleDollarSign />}
        />
        <Metric
          label="Appointments · 90 days"
          value={formatNumber(data.kpis.appointments90)}
          change={data.kpis.appointmentsChange}
          changeLabel="vs previous period"
          icon={<CalendarCheck2 />}
        />
        <Metric
          label="Average production"
          value={formatCurrency(data.kpis.avgProduction)}
          change={data.kpis.avgProductionChange}
          changeLabel="per completed visit"
          icon={<TrendingUp />}
        />
        <Metric
          label="No-show rate"
          value={formatPercent(data.kpis.noShowRate)}
          change={data.kpis.noShowChange}
          changeSuffix=" pts"
          changeLabel="vs previous period"
          icon={<Percent />}
        />
      </MetricStrip>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <Panel>
          <AnalyticsCharts monthly={data.monthly} />
        </Panel>

        <Panel>
          <PanelHeader title="Recall funnel" description="Current audience through to attended visits." />
          <div className="space-y-3.5 px-4 py-4">
            {data.funnel.map((stage, index) => {
              const pct = Math.max(1, Math.min(100, stage.pct));
              return (
                <div key={stage.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{stage.label}</span>
                    <span className="tabular text-[#c5d2e8]">
                      {formatNumber(stage.value)} <span className="text-muted-foreground/70">· {stage.pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={index === 0 ? "h-full rounded-full bg-[#2f5f9a]" : "h-full rounded-full bg-[#2f8fe0]"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-line px-4 py-3">
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Modelled from the live recall queue and channel consent. Attribution updates as appointments are completed.
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Recovery by treatment" description="Attributed revenue over the last 12 months." />
          <div className="space-y-3 px-4 py-4">
            {data.byTreatment.map((item) => (
              <div key={item.treatment}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="flex items-center gap-2 tabular">
                    <span className="text-[#c5d2e8]">{formatCurrency(item.recovered)}</span>
                    <span className="text-muted-foreground/70">{item.due} due</span>
                  </span>
                </div>
                <Bar value={item.recovered} max={maxTreatment} tone={item.treatment === "hygiene" ? "cyan" : "blue"} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
            <div className="px-4 py-3">
              <SectionLabel>Highest volume</SectionLabel>
              <p className="mt-1 text-[12px] font-medium text-ink">{data.byTreatment[0]?.label ?? "—"}</p>
              <p className="text-[10px] text-muted-foreground">{data.byTreatment[0] ? formatPercent(data.byTreatment[0].share) : "—"} of due patients</p>
            </div>
            <div className="px-4 py-3">
              <SectionLabel>Highest value</SectionLabel>
              <p className="mt-1 text-[12px] font-medium text-ink">
                {[...data.byTreatment].sort((a, b) => b.recovered - a.recovered)[0]?.label ?? "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">attributed revenue</p>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Location performance" description="Recall density and recovered revenue by clinic." />
          <div className="overflow-x-auto app-scroll">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
                  <th className="py-2 pl-4 pr-2 font-medium">Location</th>
                  <th className="px-2 py-2 font-medium">Patients</th>
                  <th className="px-2 py-2 font-medium">Due</th>
                  <th className="px-2 py-2 font-medium">Recovered</th>
                  <th className="py-2 pl-2 pr-4 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.byLocation.map((location) => (
                  <tr key={location.name} className="border-b border-line/60 last:border-0">
                    <td className="truncate py-2.5 pl-4 pr-2 text-[12px] font-medium text-[#dbe4f3]">{location.name}</td>
                    <td className="tabular px-2 py-2.5 text-[12px] text-muted-foreground">{formatNumber(location.patients)}</td>
                    <td className="tabular px-2 py-2.5 text-[12px] text-[#c5d2e8]">{formatNumber(location.due)}</td>
                    <td className="tabular px-2 py-2.5 text-[12px] text-[#83e0b3]">{formatCurrency(location.recovered)}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="tabular text-[11px] text-[#c5d2e8]">{formatPercent(location.rate)}</span>
                        <span className="h-1 w-10 overflow-hidden rounded-full bg-white/[0.06]">
                          <span className="block h-full rounded-full bg-[#53d2e5]" style={{ width: `${Math.min(100, location.rate)}%` }} />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Recall distribution" description="Where patients sit in the recall lifecycle right now." />
        <div className="grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          {data.recallBuckets.map((bucket) => (
            <div key={bucket.label} className="border-b border-line px-4 py-4 last:border-b-0 lg:border-b-0">
              <div className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${BUCKET_TONES[bucket.tone] ?? BUCKET_TONES.muted}`} />
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">{bucket.label}</p>
              </div>
              <p className="mt-1.5 tabular text-[20px] font-semibold tracking-[-0.03em] text-ink">{formatNumber(bucket.value)}</p>
              <div className="mt-2">
                <Bar value={bucket.value} max={maxBucket} tone={bucket.tone === "cyan" ? "cyan" : bucket.tone === "amber" || bucket.tone === "red" ? "muted" : "muted"} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
