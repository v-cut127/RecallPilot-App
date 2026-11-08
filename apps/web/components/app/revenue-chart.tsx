"use client";

import { useMemo, useState } from "react";
import { cn } from "@recallpilot/ui";
import { Segmented } from "./client-ui";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";

export interface ChartPoint {
  label: string;
  fullLabel: string;
  value: number;
  previous: number;
}

export interface ChartRange {
  key: "30d" | "3m" | "12m";
  label: string;
  points: ChartPoint[];
  total: number;
  previousTotal: number;
  changePct: number;
}

type RangeKey = "30d" | "3m" | "12m";

const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: "30d", label: "30D" },
  { value: "3m", label: "3M" },
  { value: "12m", label: "12M" },
];

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const next = points[index + 1]!;
    const controlX = (current.x + next.x) / 2;
    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

export function RevenueChart({
  ranges,
  className,
  height = 224,
  showHeader = true,
  initialRange = "3m",
  allowedRanges,
}: {
  ranges: Partial<Record<RangeKey, ChartRange>>;
  className?: string;
  height?: number | "fill";
  showHeader?: boolean;
  initialRange?: RangeKey;
  allowedRanges?: RangeKey[];
}) {
  const options = RANGE_OPTIONS.filter((option) => (!allowedRanges || allowedRanges.includes(option.value)) && Boolean(ranges[option.value]));
  const initial = ranges[initialRange] ? initialRange : options[0]?.value ?? "3m";
  const [range, setRange] = useState<RangeKey>(initial);
  const [hover, setHover] = useState<number | null>(null);
  const data = ranges[range] ?? ranges[initial]!;

  const geometry = useMemo(() => {
    const values = data.points;
    const max = Math.max(1, ...values.map((point) => Math.max(point.value, point.previous)));
    const step = values.length > 1 ? 100 / (values.length - 1) : 100;
    const toPoints = (key: "value" | "previous") =>
      values.map((point, index) => ({
        x: index * step,
        y: 100 - (point[key] / max) * 88 - 6,
      }));
    return {
      current: toPoints("value"),
      previous: toPoints("previous"),
      max,
    };
  }, [data]);

  const linePath = smoothPath(geometry.current);
  const previousPath = smoothPath(geometry.previous);
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;
  const active = hover !== null ? data.points[hover] : null;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-[13px] font-semibold text-ink">Revenue recovered</h2>
              <span className="text-[11px] text-muted-foreground">Attributed to recall outreach</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="tabular text-[20px] font-semibold tracking-[-0.03em] text-ink">{formatCurrency(data.total)}</span>
              <span
                className={cn(
                  "text-[11px] font-medium tabular",
                  data.changePct >= 0 ? "text-[#5bd39a]" : "text-[#f2777a]"
                )}
              >
                {data.changePct >= 0 ? "+" : ""}
                {data.changePct}%
              </span>
              <span className="text-[11px] text-muted-foreground">vs previous period</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-[10px] text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-3 rounded-full bg-[#53d2e5]" /> Recovered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-3 rounded-full border-t border-dashed border-[#4a5975]" /> Previous
              </span>
            </div>
            <Segmented options={options} value={range} onChange={setRange} ariaLabel="Chart range" />
          </div>
        </div>
      ) : null}

      <div className="relative flex flex-1 flex-col px-4 pb-3 pt-4">
        <div className="pointer-events-none absolute bottom-8 left-0 right-0 top-4 flex flex-col justify-between px-4">
          {[1, 0.66, 0.33, 0].map((fraction) => (
            <div key={fraction} className="flex items-center gap-2">
              <span className="tabular w-9 text-right text-[9px] text-muted-foreground/60">
                {fraction === 0 ? "€0" : formatCompactCurrency(geometry.max * fraction)}
              </span>
              <div className="h-px flex-1 bg-white/[0.045]" />
            </div>
          ))}
        </div>

        <div
          className="relative ml-11 min-h-[180px] flex-1"
          style={typeof height === "number" ? { height, flex: "none" } : undefined}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id="revenue-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#53d2e5" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#53d2e5" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#revenue-area)" />
            <path
              d={previousPath}
              fill="none"
              stroke="#45546f"
              strokeWidth="1.25"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <path d={linePath} fill="none" stroke="#53d2e5" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            {hover !== null && geometry.current[hover] ? (
              <>
                <line
                  x1={geometry.current[hover]!.x}
                  y1="0"
                  x2={geometry.current[hover]!.x}
                  y2="100"
                  stroke="#2a3a57"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={geometry.current[hover]!.x}
                  cy={geometry.current[hover]!.y}
                  r="2.4"
                  fill="#53d2e5"
                  stroke="#04101f"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            ) : null}
          </svg>

          <div className="absolute inset-0 flex">
            {data.points.map((point, index) => (
              <button
                key={`${point.fullLabel}-${index}`}
                type="button"
                aria-label={`${point.fullLabel}: ${formatCurrency(point.value)}`}
                className="h-full flex-1 cursor-default"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
              />
            ))}
          </div>

          {active && hover !== null ? (
            <div
              className="pointer-events-none absolute top-1 z-10 w-[150px] -translate-x-1/2 rounded-[6px] border border-line bg-popover p-2 shadow-[0_12px_30px_rgba(0,0,0,0.5)]"
              style={{
                left: `${Math.min(88, Math.max(12, (hover / Math.max(1, data.points.length - 1)) * 100))}%`,
              }}
            >
              <p className="text-[10px] text-muted-foreground">{active.fullLabel}</p>
              <p className="mt-1 tabular text-[13px] font-semibold text-ink">{formatCurrency(active.value)}</p>
              <p className="mt-0.5 tabular text-[10px] text-muted-foreground">Prev. {formatCurrency(active.previous)}</p>
            </div>
          ) : null}
        </div>

        <div className="ml-11 mt-2 flex items-center justify-between text-[9px] text-muted-foreground/70">
          {data.points
            .filter((_, index) => {
              const total = data.points.length;
              if (total <= 7) return true;
              const step = Math.ceil(total / 6);
              return index === 0 || index === total - 1 || index % step === 0;
            })
            .map((point, index) => (
              <span key={`${point.label}-${index}`}>{point.label}</span>
            ))}
        </div>
      </div>
    </div>
  );
}
