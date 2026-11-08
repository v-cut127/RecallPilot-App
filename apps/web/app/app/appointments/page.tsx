import Link from "next/link";
import { CalendarCheck2, CalendarDays, Check, CircleDollarSign, Clock, Percent } from "lucide-react";
import { requireOrgContext } from "@/lib/auth";
import { formatCurrency, formatNumber, getAppointmentFormData, getAppointmentsPage } from "@/lib/app-data";
import { Metric, MetricStrip, PageHeader, Panel } from "@/components/app/ui";
import { FilterSelect, SearchField } from "@/components/app/client-ui";
import { AppointmentsTable } from "@/components/app/appointments-table";
import { NewAppointmentButton } from "@/components/app/appointment-form";

export const metadata = { title: "Appointments" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireOrgContext();
  const params = await searchParams;
  const tab = first(params.tab) === "completed" ? "completed" : "upcoming";
  const q = first(params.q) ?? "";
  const location = first(params.location) ?? "all";
  const page = Math.max(1, Number(first(params.page) ?? 1) || 1);
  const patientId = first(params.patient);
  const created = first(params.created) === "1";

  const [data, formPatients] = await Promise.all([
    getAppointmentsPage(context.organization.id, { tab, q, location, page }),
    getAppointmentFormData(context.organization.id),
  ]);

  const base = new URLSearchParams();
  if (tab !== "upcoming") base.set("tab", tab);
  if (q) base.set("q", q);
  if (location !== "all") base.set("location", location);
  const pageHref = (target: number) => {
    const next = new URLSearchParams(base);
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return `/app/appointments${query ? `?${query}` : ""}`;
  };
  const tabHref = (value: "upcoming" | "completed") => {
    const next = new URLSearchParams();
    if (value !== "upcoming") next.set("tab", value);
    if (q) next.set("q", q);
    if (location !== "all") next.set("location", location);
    const query = next.toString();
    return `/app/appointments${query ? `?${query}` : ""}`;
  };
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
  const start = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const end = Math.min(data.total, data.page * data.pageSize);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Appointments"
        description="The recall schedule, booked visits and completed production in one view."
        actions={<NewAppointmentButton patients={formPatients} initialPatientId={patientId} autoOpen={Boolean(patientId)} />}
      />

      {created ? (
        <div className="flex items-center gap-2 rounded-[6px] border border-[#4cc38a]/20 bg-[#4cc38a]/[0.06] px-3 py-2 text-[12px] text-[#83e0b3]">
          <Check className="size-3.5" />
          Appointment scheduled. It now appears at the top of the upcoming list.
        </div>
      ) : null}

      <MetricStrip>
        <Metric label="Completed · 90 days" value={formatNumber(data.stats.completed30)} changeLabel="recall-related and routine visits" icon={<CalendarCheck2 />} />
        <Metric label="Production · 90 days" value={formatCurrency(data.stats.completedValue30)} changeLabel="completed appointments" icon={<CircleDollarSign />} />
        <Metric label="Recall window" value={formatNumber(data.stats.upcoming30)} changeLabel="patients due in 30 days" icon={<CalendarDays />} />
        <Metric label="Show rate" value={`${data.stats.showRate}%`} changeLabel={`${formatCurrency(data.stats.averageValue)} avg. value`} icon={<Percent />} />
      </MetricStrip>

      <Panel>
        <div className="flex h-10 items-center gap-1 overflow-x-auto border-b border-line px-2 app-scroll">
          <Link
            href={tabHref("upcoming")}
            className={`relative -mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b px-2 text-[12px] font-medium transition-colors ${
              tab === "upcoming" ? "border-[#53d2e5] text-ink" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            Upcoming
            <span className="rounded-[4px] bg-white/[0.05] px-1 text-[10px] tabular text-muted-foreground">{formatNumber(data.stats.upcoming30)}</span>
          </Link>
          <Link
            href={tabHref("completed")}
            className={`relative -mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b px-2 text-[12px] font-medium transition-colors ${
              tab === "completed" ? "border-[#53d2e5] text-ink" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            Completed
            <span className="rounded-[4px] bg-white/[0.05] px-1 text-[10px] tabular text-muted-foreground">{formatNumber(data.stats.completed30)}</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <SearchField defaultValue={q} placeholder="Search patients…" className="w-full sm:w-[260px]" />
          <FilterSelect
            param="location"
            value={location}
            options={[{ value: "all", label: "All locations" }, ...context.locations.map((item) => ({ value: item.id, label: item.name }))]}
          />
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="size-3" />
            {tab === "upcoming" ? "Planned recalls include unbooked patients" : "Most recent first"}
          </span>
        </div>

        <AppointmentsTable
          rows={data.rows.map((row) => ({
            id: row.id,
            startsAt: row.startsAt.toISOString(),
            patientId: row.patientId,
            patientName: row.patientName,
            treatmentLabel: row.treatmentLabel,
            status: row.status,
            productionValue: row.productionValue,
            locationName: row.locationName,
            providerName: row.providerName,
            source: row.source,
          }))}
          tab={tab}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            Showing <span className="tabular text-[#c5d2e8]">{start}–{end}</span> of{" "}
            <span className="tabular text-[#c5d2e8]">{formatNumber(data.total)}</span>
          </p>
          <div className="flex items-center gap-1">
            <Link
              href={pageHref(data.page - 1)}
              className={`inline-flex h-6 items-center rounded-[4px] border border-line px-2 text-[11px] font-medium ${
                data.page <= 1 ? "pointer-events-none opacity-40" : "text-[#c2cde0] hover:bg-white/[0.05] hover:text-ink"
              }`}
            >
              Previous
            </Link>
            <span className="px-1.5 text-[11px] tabular text-muted-foreground">{data.page} / {pageCount}</span>
            <Link
              href={pageHref(data.page + 1)}
              className={`inline-flex h-6 items-center rounded-[4px] border border-line px-2 text-[11px] font-medium ${
                data.page >= pageCount ? "pointer-events-none opacity-40" : "text-[#c2cde0] hover:bg-white/[0.05] hover:text-ink"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
