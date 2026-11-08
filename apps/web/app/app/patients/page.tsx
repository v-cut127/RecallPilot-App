import Link from "next/link";
import { Upload } from "lucide-react";
import { requireOrgContext } from "@/lib/auth";
import { campaignForTreatment, getPatientsPage } from "@/lib/app-data";
import { PageHeader, Panel } from "@/components/app/ui";
import { FilterSelect, SearchField } from "@/components/app/client-ui";
import { ExportPatientsButton, PatientsTable, type PatientTableRow } from "@/components/app/patients-table";

export const metadata = { title: "Patients" };
export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { value: "all", label: "All patients", countKey: "all" },
  { value: "needs_recall", label: "Needs recall", countKey: "needs_recall" },
  { value: "overdue", label: "Overdue", countKey: "overdue" },
  { value: "lapsed", label: "Lapsed", countKey: "lapsed" },
  { value: "no_contact", label: "No contact", countKey: "no_contact" },
];

const SORT_OPTIONS = [
  { value: "attention", label: "Recommended" },
  { value: "recall_asc", label: "Recall date · soonest" },
  { value: "recall_desc", label: "Recall date · latest" },
  { value: "name_asc", label: "Name · A to Z" },
  { value: "name_desc", label: "Name · Z to A" },
  { value: "last_visit_desc", label: "Last visit · recent" },
  { value: "last_visit_asc", label: "Last visit · oldest" },
  { value: "value_desc", label: "Estimated value" },
];

const TREATMENT_OPTIONS = [
  { value: "all", label: "All treatments" },
  { value: "hygiene", label: "Hygiene" },
  { value: "checkup", label: "Check-up" },
  { value: "treatment", label: "Treatment" },
  { value: "other", label: "Other" },
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireOrgContext();
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const status = first(params.status) ?? "all";
  const treatment = first(params.treatment) ?? "all";
  const location = first(params.location) ?? "all";
  const sort = first(params.sort) ?? "attention";
  const page = Math.max(1, Number(first(params.page) ?? 1) || 1);

  const data = await getPatientsPage(context.organization.id, {
    q,
    status,
    treatment,
    location,
    sort,
    page,
    pageSize: 25,
  });

  const rows: PatientTableRow[] = data.rows.map((patient) => ({
    id: patient.id,
    name: patient.name,
    email: patient.email,
    phone: patient.phone,
    lastVisitAt: patient.lastVisitAt,
    recallDue: patient.recallDue,
    treatmentLabel: patient.treatmentLabel,
    estimatedValue: patient.estimatedValue,
    recallStatus: patient.recallStatus,
    campaign: campaignForTreatment(patient.treatment),
    locationName: patient.locationName,
  }));

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (treatment !== "all") baseParams.set("treatment", treatment);
  if (location !== "all") baseParams.set("location", location);
  if (sort !== "attention") baseParams.set("sort", sort);

  const withParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(baseParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    const query = next.toString();
    return `/app/patients${query ? `?${query}` : ""}`;
  };

  const statusHref = (value: string) => {
    const next = new URLSearchParams(baseParams);
    if (value === "all") next.delete("status");
    else next.set("status", value);
    next.delete("page");
    const query = next.toString();
    return `/app/patients${query ? `?${query}` : ""}`;
  };

  const sortHrefs: Record<string, string> = {
    name_asc: withParams({ sort: "name_asc" }),
    name_desc: withParams({ sort: "name_desc" }),
    recall_asc: withParams({ sort: "recall_asc" }),
    recall_desc: withParams({ sort: "recall_desc" }),
    last_visit_desc: withParams({ sort: "last_visit_desc" }),
    last_visit_asc: withParams({ sort: "last_visit_asc" }),
    value_desc: withParams({ sort: "value_desc" }),
  };

  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
  const start = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const end = Math.min(data.total, data.page * data.pageSize);
  const pageHref = (target: number) => {
    const next = new URLSearchParams(baseParams);
    if (status !== "all") next.set("status", status);
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return `/app/patients${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patients"
        description={`${(data.counts.all ?? 0).toLocaleString("en-US")} active patient records across ${
          context.locations.length
        } location${context.locations.length === 1 ? "" : "s"}.`}
        actions={
          <>
            <ExportPatientsButton rows={rows} />
            <Link
              href="/app/import"
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#006ec3] px-2.5 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors hover:bg-[#0a7bd4]"
            >
              <Upload className="size-3.5" />
              Import patients
            </Link>
          </>
        }
      />

      <Panel>
        <div className="flex h-10 items-center gap-1 overflow-x-auto border-b border-line px-2 app-scroll">
          {STATUS_TABS.map((tab) => {
            const active = tab.value === status || (tab.value === "all" && status === "all");
            const count = data.counts[tab.countKey] ?? 0;
            return (
              <Link
                key={tab.value}
                href={statusHref(tab.value)}
                className={`relative -mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b px-2 text-[12px] font-medium transition-colors ${
                  active ? "border-[#53d2e5] text-ink" : "border-transparent text-muted-foreground hover:text-ink"
                }`}
              >
                {tab.label}
                <span className="rounded-[4px] bg-white/[0.05] px-1 text-[10px] tabular text-muted-foreground">
                  {count.toLocaleString("en-US")}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <SearchField defaultValue={q} placeholder="Search by name, email or phone…" className="w-full sm:w-[268px]" />
          <FilterSelect param="treatment" value={treatment} options={TREATMENT_OPTIONS} />
          <FilterSelect
            param="location"
            value={location}
            options={[{ value: "all", label: "All locations" }, ...context.locations.map((item) => ({ value: item.id, label: item.name }))]}
          />
          <FilterSelect param="sort" value={sort} options={SORT_OPTIONS} align="end" className="ml-auto" />
        </div>

        <PatientsTable rows={rows} sort={sort} sortHrefs={sortHrefs} />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            Showing <span className="tabular text-[#c7c7cd]">{start.toLocaleString("en-US")}–{end.toLocaleString("en-US")}</span> of{" "}
            <span className="tabular text-[#c7c7cd]">{data.total.toLocaleString("en-US")}</span>
          </p>
          <div className="flex items-center gap-1">
            <Link
              href={pageHref(data.page - 1)}
              aria-disabled={data.page <= 1}
              className={`inline-flex h-6 items-center rounded-[4px] border border-line px-2 text-[11px] font-medium transition-colors ${
                data.page <= 1 ? "pointer-events-none opacity-40" : "text-[#c4c4ca] hover:bg-white/[0.05] hover:text-ink"
              }`}
            >
              Previous
            </Link>
            <span className="px-1.5 text-[11px] tabular text-muted-foreground">
              {data.page} / {pageCount}
            </span>
            <Link
              href={pageHref(data.page + 1)}
              aria-disabled={data.page >= pageCount}
              className={`inline-flex h-6 items-center rounded-[4px] border border-line px-2 text-[11px] font-medium transition-colors ${
                data.page >= pageCount ? "pointer-events-none opacity-40" : "text-[#c4c4ca] hover:bg-white/[0.05] hover:text-ink"
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
