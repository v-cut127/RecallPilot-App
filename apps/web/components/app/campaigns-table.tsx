"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pause, Play, Settings2 } from "lucide-react";
import { StatusBadge } from "./ui";
import { DropdownMenu } from "./client-ui";
import { toggleCampaignAction } from "@/app/app/actions";
import { formatCurrency, formatPercent } from "@/lib/format";

export interface CampaignRow {
  id: string;
  name: string;
  treatmentLabel: string;
  status: string;
  active: boolean;
  targetCount: number;
  contacted: number;
  responseRate: number;
  bookings: number;
  recovered: number;
  intervalMonths: number;
}

export function CampaignsTable({ rows }: { rows: CampaignRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = (row: CampaignRow) => {
    const form = new FormData();
    form.set("campaignId", row.id);
    form.set("active", String(!row.active));
    setBusyId(row.id);
    startTransition(async () => {
      await toggleCampaignAction(form);
      setBusyId(null);
      router.refresh();
    });
  };

  return (
    <div className="overflow-x-auto app-scroll">
      <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
            <th className="w-[27%] py-2 pl-4 pr-2 font-medium">Campaign</th>
            <th className="w-[10%] px-2 py-2 font-medium">Status</th>
            <th className="w-[10%] px-2 py-2 font-medium">Audience</th>
            <th className="w-[10%] px-2 py-2 font-medium">Contacted</th>
            <th className="w-[13%] px-2 py-2 font-medium">Response rate</th>
            <th className="w-[10%] px-2 py-2 font-medium">Bookings</th>
            <th className="w-[12%] px-2 py-2 font-medium">Recovered</th>
            <th className="w-[8%] py-2 pl-2 pr-4 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.018]">
              <td className="py-2.5 pl-4 pr-2">
                <Link href={`/app/campaigns/${row.id}`} className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-[5px] border border-line bg-surface-2 text-[10px] font-semibold text-[#8ed8ff]">
                    {row.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-[#dedee1] group-hover:text-ink">{row.name}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {row.treatmentLabel} · every {row.intervalMonths} months
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-2 py-2.5">
                <StatusBadge status={row.status} />
              </td>
              <td className="tabular px-2 py-2.5 text-[12px] text-[#c7c7cd]">{row.targetCount.toLocaleString("en-US")}</td>
              <td className="tabular px-2 py-2.5 text-[12px] text-muted-foreground">{row.contacted.toLocaleString("en-US")}</td>
              <td className="px-2 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="tabular text-[12px] text-[#c7c7cd]">{formatPercent(row.responseRate)}</span>
                  <span className="h-1 w-10 overflow-hidden rounded-full bg-white/[0.06]">
                    <span className="block h-full rounded-full bg-[#53d2e5]" style={{ width: `${Math.min(100, row.responseRate)}%` }} />
                  </span>
                </div>
              </td>
              <td className="tabular px-2 py-2.5 text-[12px] text-[#c7c7cd]">{row.bookings.toLocaleString("en-US")}</td>
              <td className="tabular px-2 py-2.5 text-[12px] text-[#83e0b3]">{formatCurrency(row.recovered)}</td>
              <td className="py-2.5 pl-2 pr-3 text-right">
                <DropdownMenu
                  ariaLabel={`Actions for ${row.name}`}
                  trigger={
                    <span className="inline-flex size-7 items-center justify-center rounded-[5px] text-muted-foreground opacity-0 transition-all hover:bg-white/[0.06] hover:text-ink group-hover:opacity-100">
                      <MoreHorizontal className="size-4" />
                    </span>
                  }
                  items={[
                    { label: "Open campaign", href: `/app/campaigns/${row.id}`, icon: <Settings2 /> },
                    {
                      label: row.active ? "Pause campaign" : "Activate campaign",
                      icon: row.active ? <Pause /> : <Play />,
                      disabled: pending && busyId === row.id,
                      onSelect: () => toggle(row),
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
