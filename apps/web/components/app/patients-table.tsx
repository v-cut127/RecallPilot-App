"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  Check,
  Copy,
  Download,
  MessageSquare,
  MoreHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@recallpilot/ui";
import { Avatar, RecallBadge } from "./ui";
import { DropdownMenu } from "./client-ui";
import { formatCurrency, relativeDay } from "@/lib/format";

export interface PatientTableRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lastVisitAt: string | null;
  recallDue: string | null;
  treatmentLabel: string;
  estimatedValue: number;
  recallStatus: string;
  campaign: string;
  locationName: string | null;
}

function csvFor(rows: PatientTableRow[]): string {
  const header = ["Patient", "Email", "Phone", "Last visit", "Next recall", "Treatment", "Estimated value", "Status", "Campaign"];
  const lines = rows.map((row) =>
    [
      row.name,
      row.email ?? "",
      row.phone ?? "",
      row.lastVisitAt ?? "",
      row.recallDue ?? "",
      row.treatmentLabel,
      String(row.estimatedValue),
      row.recallStatus,
      row.campaign,
    ]
      .map((value) => `"${value.replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

function download(rows: PatientTableRow[], filename: string) {
  const blob = new Blob([csvFor(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportPatientsButton({ rows }: { rows: PatientTableRow[] }) {
  return (
    <button
      type="button"
      onClick={() => download(rows, "recallpilot-patients.csv")}
      className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line bg-white/[0.02] px-2.5 text-[12px] font-medium text-[#c2cde0] transition-colors hover:bg-white/[0.05] hover:text-ink"
    >
      <Download className="size-3.5" />
      Export
    </button>
  );
}

export function PatientsTable({
  rows,
  sort,
  sortHrefs,
}: {
  rows: PatientTableRow[];
  sort: string;
  sortHrefs: Record<string, string>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const selectedRows = useMemo(() => rows.filter((row) => selected.has(row.id)), [rows, selected]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns = [
    { key: "patient", label: "Patient" },
    { key: "contact", label: "Contact" },
    { key: "last_visit", label: "Last visit", sortKey: "last_visit_desc" },
    { key: "recall", label: "Next recall", sortKey: "recall_asc" },
    { key: "treatment", label: "Treatment" },
    { key: "value", label: "Est. value", sortKey: "value_desc" },
    { key: "status", label: "Status" },
    { key: "campaign", label: "Campaign" },
  ];

  return (
    <div>
      {selected.size > 0 ? (
        <div className="flex h-10 items-center justify-between gap-3 border-b border-line bg-[#0b1c36] px-3">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="flex size-4 items-center justify-center rounded-[3px] bg-[#006ec3] text-[9px] font-semibold text-white">
              {selected.size}
            </span>
            <span className="text-[#c5d2e8]">selected</span>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-1 text-[11px] text-muted-foreground hover:text-ink">
              Clear
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href={selectedRows[0] ? `/app/conversations?patient=${selectedRows[0].id}` : "/app/conversations"}
              className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-line px-1.5 text-[11px] font-medium text-[#c2cde0] hover:bg-white/[0.05] hover:text-ink"
            >
              <MessageSquare className="size-3" /> Message
            </Link>
            <button
              type="button"
              onClick={() => download(selectedRows, "recallpilot-selection.csv")}
              className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-line px-1.5 text-[11px] font-medium text-[#c2cde0] hover:bg-white/[0.05] hover:text-ink"
            >
              <Download className="size-3" /> Export
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto app-scroll">
        <table className="w-full min-w-[980px] table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
              <th className="w-9 py-2 pl-4 pr-1">
                <button
                  type="button"
                  aria-label="Select all patients"
                  onClick={() =>
                    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))
                  }
                  className={cn(
                    "flex size-3.5 items-center justify-center rounded-[3px] border transition-colors",
                    allSelected ? "border-[#006ec3] bg-[#006ec3] text-white" : "border-[#2a3852] hover:border-[#3d5070]"
                  )}
                >
                  {allSelected ? <Check className="size-2.5" /> : null}
                </button>
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-2 py-2 font-medium",
                    column.key === "patient" && "w-[20%]",
                    column.key === "contact" && "w-[17%]",
                    column.key === "last_visit" && "w-[10%]",
                    column.key === "recall" && "w-[10%]",
                    column.key === "treatment" && "w-[9%]",
                    column.key === "value" && "w-[8%]",
                    column.key === "status" && "w-[11%]",
                    column.key === "campaign" && "w-[10%]"
                  )}
                >
                  {column.sortKey ? (
                    <Link
                      href={sortHrefs[column.sortKey === "last_visit_desc" && sort === "last_visit_desc" ? "last_visit_asc" : column.sortKey === "recall_asc" && sort === "recall_asc" ? "recall_desc" : column.sortKey] ?? "#"}
                      className="inline-flex items-center gap-1 transition-colors hover:text-ink"
                    >
                      {column.label}
                      {sort === column.sortKey || (column.key === "last_visit" && sort.startsWith("last_visit")) || (column.key === "recall" && sort.startsWith("recall")) ? (
                        <span className="text-[#53d2e5]">↓</span>
                      ) : null}
                    </Link>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              <th className="w-8 py-2 pl-1 pr-3 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = selected.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "group border-b border-line/60 transition-colors last:border-0",
                    isSelected ? "bg-[#006ec3]/[0.07]" : "hover:bg-white/[0.018]"
                  )}
                >
                  <td className="py-2.5 pl-4 pr-1">
                    <button
                      type="button"
                      aria-label={`Select ${row.name}`}
                      onClick={() => toggle(row.id)}
                      className={cn(
                        "flex size-3.5 items-center justify-center rounded-[3px] border transition-colors",
                        isSelected ? "border-[#006ec3] bg-[#006ec3] text-white" : "border-[#2a3852] opacity-0 hover:border-[#3d5070] group-hover:opacity-100",
                        isSelected && "opacity-100"
                      )}
                    >
                      {isSelected ? <Check className="size-2.5" /> : null}
                    </button>
                  </td>
                  <td className="px-2 py-2.5">
                    <Link href={`/app/patients/${row.id}`} className="flex min-w-0 items-center gap-2">
                      <Avatar name={row.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-[#dbe4f3] group-hover:text-ink">{row.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{row.locationName ?? "Unassigned"}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-2 py-2.5">
                    <p className="truncate text-[12px] text-[#c5d2e8]">{row.phone ?? row.email ?? "—"}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {row.phone && row.email ? row.email : row.phone ? "Phone only" : row.email ? "Email only" : "No contact"}
                    </p>
                  </td>
                  <td className="truncate px-2 py-2.5 text-[12px] text-muted-foreground">{relativeDay(row.lastVisitAt)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[12px] text-[#c5d2e8]">{relativeDay(row.recallDue)}</td>
                  <td className="truncate px-2 py-2.5 text-[12px] text-muted-foreground">{row.treatmentLabel}</td>
                  <td className="tabular px-2 py-2.5 text-[12px] text-[#c5d2e8]">{formatCurrency(row.estimatedValue)}</td>
                  <td className="px-2 py-2.5">
                    <RecallBadge status={row.recallStatus} />
                  </td>
                  <td className="truncate whitespace-nowrap px-2 py-2.5 text-[11px] text-muted-foreground">{row.campaign}</td>
                  <td className="py-2.5 pl-1 pr-3 text-right">
                    <DropdownMenu
                      ariaLabel={`Actions for ${row.name}`}
                      trigger={
                        <span className="inline-flex size-7 items-center justify-center rounded-[5px] text-muted-foreground opacity-0 transition-all hover:bg-white/[0.06] hover:text-ink group-hover:opacity-100">
                          <MoreHorizontal className="size-4" />
                        </span>
                      }
                      items={[
                        { label: "View patient", href: `/app/patients/${row.id}`, icon: <UserRound /> },
                        { label: "Open conversation", href: `/app/conversations?patient=${row.id}`, icon: <MessageSquare /> },
                        { label: "Schedule appointment", href: `/app/appointments?patient=${row.id}`, icon: <CalendarPlus /> },
                        {
                          label: row.phone ? "Copy phone number" : "Copy email",
                          icon: <Copy />,
                          onSelect: () => {
                            const value = row.phone ?? row.email;
                            if (value) void navigator.clipboard.writeText(value);
                          },
                          disabled: !row.phone && !row.email,
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <p className="text-[13px] font-medium text-ink">No patients match these filters</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Try a different status, treatment or search term.</p>
          <Link
            href="/app/patients"
            className="mt-3 inline-flex h-7 items-center gap-1 rounded-[5px] border border-line px-2 text-[11px] font-medium text-[#c2cde0] hover:bg-white/[0.05] hover:text-ink"
          >
            <X className="size-3" /> Clear filters
          </Link>
        </div>
      ) : null}
    </div>
  );
}
