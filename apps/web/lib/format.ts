import { format, startOfDay } from "date-fns";

const MS_DAY = 86_400_000;

export function formatCurrency(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function parseAppDate(value: Date | string): Date {
  if (typeof value !== "string") return value;
  return new Date(value.length <= 10 ? `${value}T12:00:00` : value);
}

export function formatDate(value: Date | string | null, pattern = "d MMM yyyy"): string {
  if (!value) return "—";
  const date = parseAppDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, pattern);
}

export function formatDay(value: Date | string | null): string | null {
  if (!value) return null;
  const date = parseAppDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "yyyy-MM-dd");
}

export function relativeDay(value: Date | string | null, now = new Date()): string {
  if (!value) return "—";
  const date = parseAppDate(value);
  const diff = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / MS_DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff <= 30) return `in ${diff} days`;
  if (diff < -1 && diff >= -30) return `${Math.abs(diff)} days ago`;
  if (diff > 30) return `in ${Math.round(diff / 30)} mo`;
  return `${Math.round(Math.abs(diff) / 30)} mo ago`;
}

export function timeAgo(value: Date | string, now = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}
