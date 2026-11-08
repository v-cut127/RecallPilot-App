"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Segmented } from "./client-ui";
import { formatCurrency } from "@/lib/format";

export interface MonthlyPoint {
  label: string;
  recovered: number;
  production: number;
}

const RANGES = [
  { value: "3" as const, label: "3M" },
  { value: "6" as const, label: "6M" },
  { value: "12" as const, label: "12M" },
];

export function AnalyticsCharts({ monthly }: { monthly: MonthlyPoint[] }) {
  const [range, setRange] = useState<"3" | "6" | "12">("12");
  const visible = useMemo(() => monthly.slice(-Number(range)), [monthly, range]);
  const max = Math.max(1, ...visible.map((point) => Math.max(point.recovered, point.production)));
  const recovered = visible.reduce((sum, point) => sum + point.recovered, 0);
  const production = visible.reduce((sum, point) => sum + point.production, 0);
  const previous = monthly.slice(Math.max(0, monthly.length - Number(range) * 2), monthly.length - Number(range));
  const previousRecovered = previous.reduce((sum, point) => sum + point.recovered, 0);
  const change = previousRecovered > 0 ? Math.round(((recovered - previousRecovered) / previousRecovered) * 1000) / 10 : 0;

  const exportCsv = () => {
    const lines = [
      "Month,Recovered,Completed production",
      ...visible.map((point) => `${point.label},${point.recovered},${point.production}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "recallpilot-analytics.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Recovered revenue vs production</h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="tabular text-[20px] font-semibold tracking-[-0.03em] text-ink">{formatCurrency(recovered)}</span>
            <span className={`text-[11px] font-medium tabular ${change >= 0 ? "text-[#5bd39a]" : "text-[#f2777a]"}`}>
              {change >= 0 ? "+" : ""}
              {change}%
            </span>
            <span className="text-[11px] text-muted-foreground">recovered · {formatCurrency(production)} completed production</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 text-[10px] text-muted-foreground sm:flex">
            <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#53d2e5]" /> Recovered</span>
            <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#2f5f9a]" /> Production</span>
          </div>
          <Segmented options={RANGES} value={range} onChange={setRange} ariaLabel="Analytics range" />
          <button
            type="button"
            onClick={exportCsv}
            aria-label="Export analytics CSV"
            className="inline-flex size-7 items-center justify-center rounded-[5px] border border-line text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-ink"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 pt-5">
        <div className="mb-2 flex items-center justify-between text-[9px] text-muted-foreground/60">
          <span>{formatCurrency(max)}</span>
          <span>Grouped by month</span>
        </div>
        <div className="flex h-[190px] items-end gap-2 border-b border-line/70 pb-px">
          {visible.map((point) => (
            <div key={point.label} className="group flex min-w-0 flex-1 items-end justify-center gap-0.5" title={`${point.label}: ${formatCurrency(point.recovered)} recovered · ${formatCurrency(point.production)} production`}>
              <div className="flex h-full w-full max-w-[26px] items-end gap-0.5">
                <div
                  className="w-1/2 rounded-t-[2px] bg-[#2f5f9a]/50 transition-colors group-hover:bg-[#2f5f9a]/80"
                  style={{ height: `${Math.max(2, (point.production / max) * 182)}px` }}
                />
                <div
                  className="w-1/2 rounded-t-[2px] bg-[#53d2e5]/70 transition-colors group-hover:bg-[#53d2e5]"
                  style={{ height: `${Math.max(2, (point.recovered / max) * 182)}px` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          {visible.map((point) => (
            <span key={point.label} className="min-w-0 flex-1 text-center text-[9px] text-muted-foreground/70">{point.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
