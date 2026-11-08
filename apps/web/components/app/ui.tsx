import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@recallpilot/ui";
import { initials } from "@/lib/format";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-between gap-4 sm:flex-row sm:items-end", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  as: Comp = "section",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
}) {
  return <Comp className={cn("app-panel overflow-hidden", className)}>{children}</Comp>;
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80", className)}>{children}</p>
  );
}

export function Metric({
  label,
  value,
  suffix,
  change,
  changeLabel,
  changeSuffix = "%",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: React.ReactNode;
  change?: number;
  changeLabel?: string;
  changeSuffix?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-surface-1 px-4 py-4 sm:px-5", className)}>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
        {icon ? <span className="text-muted-foreground/80 [&_svg]:size-3.5">{icon}</span> : null}
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="tabular text-[26px] font-semibold leading-none tracking-[-0.035em] text-ink">{value}</span>
        {suffix ? <span className="text-[12px] text-muted-foreground">{suffix}</span> : null}
      </div>
      <div className="mt-2 flex min-h-[16px] items-center gap-2 text-[11px]">
        {typeof change === "number" ? <Trend value={change} suffix={changeSuffix} /> : null}
        {changeLabel ? <span className="text-muted-foreground">{changeLabel}</span> : null}
      </div>
    </div>
  );
}

export function MetricStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}

export function Trend({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value > 0;
  const neutral = value === 0;
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular",
        neutral ? "text-muted-foreground" : positive ? "text-[#5bd39a]" : "text-[#f2777a]"
      )}
    >
      <Icon className="size-3" strokeWidth={2.2} />
      {Math.abs(value)}
      {suffix}
    </span>
  );
}

const RECALL_TONES: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  due_soon: { label: "Due soon", dot: "bg-[#53d2e5]", text: "text-[#a9e7f1]", bg: "bg-[#53d2e5]/10 border-[#53d2e5]/20" },
  overdue: { label: "Overdue", dot: "bg-[#e3b341]", text: "text-[#eccb76]", bg: "bg-[#e3b341]/10 border-[#e3b341]/20" },
  lapsed: { label: "Lapsed", dot: "bg-[#f2777a]", text: "text-[#f6a3a5]", bg: "bg-[#f2777a]/10 border-[#f2777a]/20" },
  upcoming: { label: "Upcoming", dot: "bg-[#7d8ba6]", text: "text-[#a7b2c7]", bg: "bg-white/[0.04] border-line" },
  no_contact: { label: "No contact", dot: "bg-[#e3b341]", text: "text-[#eccb76]", bg: "bg-[#e3b341]/10 border-[#e3b341]/20" },
  no_recall: { label: "No recall", dot: "bg-[#59657c]", text: "text-[#97a2b8]", bg: "bg-white/[0.04] border-line" },
};

const FALLBACK_RECALL_TONE = {
  label: "No recall",
  dot: "bg-[#59657c]",
  text: "text-[#97a2b8]",
  bg: "bg-white/[0.04] border-line",
};

export function RecallBadge({ status, className }: { status: string; className?: string }) {
  const tone = RECALL_TONES[status] ?? FALLBACK_RECALL_TONE;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium",
        tone.bg,
        tone.text,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {tone.label}
    </span>
  );
}

const STATUS_TONES: Record<string, string> = {
  active: "bg-[#4cc38a]/10 border-[#4cc38a]/20 text-[#83e0b3]",
  scheduled: "bg-[#006ec3]/12 border-[#006ec3]/25 text-[#83bdf0]",
  paused: "bg-white/[0.04] border-line text-[#a7b2c7]",
  completed: "bg-[#4cc38a]/10 border-[#4cc38a]/20 text-[#83e0b3]",
  cancelled: "bg-[#f2777a]/10 border-[#f2777a]/20 text-[#f6a3a5]",
  no_show: "bg-[#e3b341]/10 border-[#e3b341]/20 text-[#eccb76]",
  booked: "bg-[#4cc38a]/10 border-[#4cc38a]/20 text-[#83e0b3]",
  replied: "bg-[#53d2e5]/10 border-[#53d2e5]/20 text-[#a9e7f1]",
  awaiting: "bg-[#e3b341]/10 border-[#e3b341]/20 text-[#eccb76]",
  unread: "bg-[#006ec3]/12 border-[#006ec3]/25 text-[#83bdf0]",
  draft: "bg-white/[0.04] border-line text-[#a7b2c7]",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  scheduled: "Scheduled",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  booked: "Booked",
  replied: "Replied",
  awaiting: "Awaiting reply",
  unread: "Unread",
  draft: "Draft",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium",
        STATUS_TONES[status] ?? "bg-white/[0.04] border-line text-[#a7b2c7]",
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {label ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dimension = size === "sm" ? "size-6 text-[9px]" : size === "lg" ? "size-10 text-[12px]" : "size-7 text-[10px]";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#101c36] font-medium text-[#c5d2e8]",
        dimension,
        className
      )}
      aria-hidden
    >
      {initials(name) || "?"}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Sparkline({
  values,
  className,
  width = 96,
  height = 28,
}: {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - 3 - ((value - min) / range) * (height - 6);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("text-[#53d2e5]", className)} width={width} height={height} aria-hidden>
      <polygon points={area} fill="currentColor" opacity="0.08" />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-line bg-white/[0.03] px-1.5 font-sans text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function InlineLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-ink", className)}
    >
      {children}
    </Link>
  );
}

export function Bar({ value, max, tone = "cyan" }: { value: number; max: number; tone?: "cyan" | "blue" | "muted" }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
      <div
        className={cn(
          "h-full rounded-full",
          tone === "cyan" ? "bg-[#53d2e5]" : tone === "blue" ? "bg-[#2f8fe0]" : "bg-[#4a5975]"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn("size-1.5 rounded-full bg-current", className)} />;
}
