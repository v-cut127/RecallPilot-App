"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, MoreHorizontal, UserRound, X } from "lucide-react";
import { Avatar, StatusBadge } from "./ui";
import { DropdownMenu } from "./client-ui";
import { updateAppointmentStatusAction } from "@/app/app/actions";
import { formatCurrency, formatDate } from "@/lib/format";

export interface AppointmentTableRow {
  id: string;
  startsAt: string;
  patientId: string;
  patientName: string;
  treatmentLabel: string;
  status: string;
  productionValue: number | null;
  locationName: string | null;
  providerName: string | null;
  source: "booked" | "planned";
}

export function AppointmentsTable({ rows, tab }: { rows: AppointmentTableRow[]; tab: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const updateStatus = (row: AppointmentTableRow, status: string) => {
    const form = new FormData();
    form.set("appointmentId", row.id);
    form.set("status", status);
    setBusyId(row.id);
    startTransition(async () => {
      await updateAppointmentStatusAction(form);
      setBusyId(null);
      router.refresh();
    });
  };

  return (
    <div className="overflow-x-auto app-scroll">
      <table className="w-full min-w-[880px] table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
            <th className="w-[15%] py-2 pl-4 pr-2 font-medium">Date</th>
            <th className="w-[21%] px-2 py-2 font-medium">Patient</th>
            <th className="w-[11%] px-2 py-2 font-medium">Treatment</th>
            <th className="w-[14%] px-2 py-2 font-medium">Provider</th>
            <th className="w-[13%] px-2 py-2 font-medium">Location</th>
            <th className="w-[10%] px-2 py-2 font-medium">Value</th>
            <th className="w-[12%] px-2 py-2 font-medium">Status</th>
            <th className="w-[4%] py-2 pl-2 pr-4 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const statusLabel = row.source === "planned" ? "Planned" : row.status === "scheduled" ? "Scheduled" : undefined;
            return (
              <tr key={row.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.018]">
                <td className="whitespace-nowrap py-2.5 pl-4 pr-2">
                  <p className="text-[12px] text-[#c7c7cd]">{formatDate(row.startsAt, "d MMM yyyy")}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(row.startsAt, "HH:mm")}</p>
                </td>
                <td className="px-2 py-2.5">
                  <Link href={`/app/patients/${row.patientId}`} className="flex min-w-0 items-center gap-2">
                    <Avatar name={row.patientName} size="sm" />
                    <span className="truncate text-[12px] font-medium text-[#dedee1] group-hover:text-ink">{row.patientName}</span>
                  </Link>
                </td>
                <td className="truncate px-2 py-2.5 text-[12px] text-muted-foreground">{row.treatmentLabel}</td>
                <td className="truncate px-2 py-2.5 text-[12px] text-muted-foreground">{row.providerName ?? "Unassigned"}</td>
                <td className="truncate px-2 py-2.5 text-[12px] text-muted-foreground">{row.locationName ?? "—"}</td>
                <td className="tabular px-2 py-2.5 text-[12px] text-[#c7c7cd]">{row.productionValue ? formatCurrency(row.productionValue) : "—"}</td>
                <td className="px-2 py-2.5">
                  <StatusBadge status={row.source === "planned" ? "scheduled" : row.status} label={statusLabel} />
                </td>
                <td className="py-2.5 pl-2 pr-3 text-right">
                  <DropdownMenu
                    ariaLabel={`Actions for ${row.patientName}`}
                    trigger={
                      <span className="inline-flex size-7 items-center justify-center rounded-[5px] text-muted-foreground opacity-0 transition-all hover:bg-white/[0.06] hover:text-ink group-hover:opacity-100">
                        <MoreHorizontal className="size-4" />
                      </span>
                    }
                    items={
                      row.source === "planned"
                        ? [
                            { label: "View patient", href: `/app/patients/${row.patientId}`, icon: <UserRound /> },
                            { label: "Book this recall", href: `/app/appointments?patient=${row.patientId}&new=1`, icon: <CalendarPlus /> },
                          ]
                        : [
                            { label: "View patient", href: `/app/patients/${row.patientId}`, icon: <UserRound /> },
                            ...(row.status === "scheduled"
                              ? [
                                  {
                                    label: "Mark completed",
                                    icon: <Check />,
                                    disabled: pending && busyId === row.id,
                                    onSelect: () => updateStatus(row, "completed"),
                                  },
                                  {
                                    label: "Cancel appointment",
                                    icon: <X />,
                                    danger: true,
                                    disabled: pending && busyId === row.id,
                                    onSelect: () => updateStatus(row, "cancelled"),
                                  },
                                ]
                              : []),
                          ]
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[13px] font-medium text-ink">{tab === "upcoming" ? "Nothing scheduled" : "No appointments yet"}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {tab === "upcoming" ? "Book a recall visit to fill the schedule." : "Completed appointments will appear here."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
