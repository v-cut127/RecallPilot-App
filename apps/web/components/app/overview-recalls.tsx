"use client";

import Link from "next/link";
import { CalendarPlus, Copy, MessageSquare, MoreHorizontal, UserRound } from "lucide-react";
import { Avatar, RecallBadge } from "./ui";
import { DropdownMenu } from "./client-ui";
import { relativeDay } from "@/lib/format";

export interface UpcomingRecallRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lastVisitAt: string | null;
  recallDue: string | null;
  status: string;
  campaign: string;
  contact: string;
}

export function UpcomingRecallsTable({ rows }: { rows: UpcomingRecallRow[] }) {
  return (
    <div className="overflow-x-auto app-scroll">
      <table className="w-full min-w-[680px] table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
            <th className="w-[22%] py-2 pl-4 pr-2 font-medium">Patient</th>
            <th className="w-[18%] px-2 py-2 font-medium">Contact</th>
            <th className="w-[11%] px-2 py-2 font-medium">Last visit</th>
            <th className="w-[11%] px-2 py-2 font-medium">Recall due</th>
            <th className="w-[13%] px-2 py-2 font-medium">Status</th>
            <th className="w-[17%] px-2 py-2 font-medium">Campaign</th>
            <th className="w-[8%] py-2 pl-2 pr-4 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.018]">
              <td className="py-2.5 pl-4 pr-2">
                <Link href={`/app/patients/${row.id}`} className="flex min-w-0 items-center gap-2">
                  <Avatar name={row.name} size="sm" />
                  <span className="truncate text-[12px] font-medium text-[#dedee1] group-hover:text-ink">{row.name}</span>
                </Link>
              </td>
              <td className="truncate px-2 py-2.5 text-[12px] text-muted-foreground">{row.contact}</td>
              <td className="truncate px-2 py-2.5 text-[12px] text-muted-foreground">{relativeDay(row.lastVisitAt)}</td>
              <td className="px-2 py-2.5">
                <span className="whitespace-nowrap text-[12px] text-[#c7c7cd]">{relativeDay(row.recallDue)}</span>
              </td>
              <td className="px-2 py-2.5">
                <RecallBadge status={row.status} />
              </td>
              <td className="truncate whitespace-nowrap px-2 py-2.5 text-[11px] text-muted-foreground">{row.campaign}</td>
              <td className="py-2.5 pl-2 pr-3 text-right">
                <DropdownMenu
                  ariaLabel={`Actions for ${row.name}`}
                  trigger={
                    <span className="inline-flex size-7 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-ink">
                      <MoreHorizontal className="size-4" />
                    </span>
                  }
                  items={[
                    { label: "View patient", href: `/app/patients/${row.id}`, icon: <UserRound /> },
                    { label: "Open conversation", href: `/app/conversations?patient=${row.id}`, icon: <MessageSquare /> },
                    { label: "Schedule appointment", href: `/app/appointments?patient=${row.id}`, icon: <CalendarPlus /> },
                    {
                      label: "Copy phone number",
                      icon: <Copy />,
                      disabled: !row.phone,
                      onSelect: () => {
                        if (row.phone) void navigator.clipboard.writeText(row.phone);
                      },
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
