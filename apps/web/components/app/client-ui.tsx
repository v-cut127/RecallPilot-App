"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Copy, Search, X } from "lucide-react";
import { cn } from "@recallpilot/ui";

export interface DropdownItem {
  label: string;
  href?: string;
  onSelect?: () => void;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

export function DropdownMenu({
  trigger,
  items,
  align = "end",
  className,
  menuClassName,
  ariaLabel = "Open menu",
}: {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
  menuClassName?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button type="button" aria-label={ariaLabel} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "app-pop-in absolute top-full z-50 mt-1.5 min-w-[184px] rounded-[7px] border border-line bg-popover p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]",
            align === "end" ? "right-0" : "left-0",
            menuClassName
          )}
        >
          {items.map((item) => (
            <div key={item.label}>
              {item.separator ? <div className="my-1 h-px bg-line" /> : null}
              {item.href ? (
                <Link
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-7 items-center gap-2 rounded-[5px] px-2 text-[12px] text-[#c2cde0] transition-colors hover:bg-white/[0.05] hover:text-ink",
                    item.danger && "text-[#f6a3a5] hover:text-[#f6a3a5]"
                  )}
                >
                  {item.icon ? <span className="[&_svg]:size-3.5">{item.icon}</span> : null}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.shortcut ? <span className="text-[10px] text-muted-foreground">{item.shortcut}</span> : null}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                  className={cn(
                    "flex h-7 w-full items-center gap-2 rounded-[5px] px-2 text-left text-[12px] text-[#c2cde0] transition-colors hover:bg-white/[0.05] hover:text-ink disabled:pointer-events-none disabled:opacity-40",
                    item.danger && "text-[#f6a3a5] hover:text-[#f6a3a5]"
                  )}
                >
                  {item.icon ? <span className="[&_svg]:size-3.5">{item.icon}</span> : null}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.shortcut ? <span className="text-[10px] text-muted-foreground">{item.shortcut}</span> : null}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 pt-[12vh] sm:p-6 sm:pt-[14vh]">
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 cursor-default bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "app-fade-in relative z-10 w-full max-w-md rounded-lg border border-line bg-popover shadow-[0_30px_80px_rgba(0,0,0,0.55)]",
          className
        )}
      >
        <div className="border-b border-line px-4 py-3.5">
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export function CopyButton({
  value,
  label = "Copy",
  className,
  iconOnly = false,
}: {
  value: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-line bg-white/[0.02] px-2 text-[11px] font-medium text-[#c2cde0] transition-colors hover:bg-white/[0.05] hover:text-ink",
        iconOnly && "w-7 justify-center px-0",
        className
      )}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check className="size-3 text-[#5bd39a]" /> : <Copy className="size-3" />}
      {iconOnly ? null : <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}

function useUrlParam() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  return {
    update(param: string, value: string | null) {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "" || value === "all") params.delete(param);
      else params.set(param, value);
      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
  };
}

export function SearchField({
  defaultValue = "",
  placeholder = "Search…",
  className,
  param = "q",
}: {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  param?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const { update } = useUrlParam();
  return (
    <form
      className={cn("relative", className)}
      onSubmit={(event) => {
        event.preventDefault();
        update(param, value.trim() || null);
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-[6px] border border-line bg-surface-2 pl-8 pr-8 text-[12px] text-ink outline-none transition-colors placeholder:text-muted-foreground focus:border-[#2a4a78] focus:bg-surface-3"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            update(param, null);
          }}
          className="absolute right-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-white/[0.06] hover:text-ink"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </form>
  );
}

export function FilterSelect({
  value,
  options,
  param,
  label,
  className,
  align = "start",
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  param: string;
  label?: string;
  className?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { update } = useUrlParam();
  const active = value && value !== "all" ? options.find((option) => option.value === value) : undefined;

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line bg-surface-2 px-2.5 text-[12px] transition-colors hover:bg-surface-3",
          active ? "text-ink" : "text-muted-foreground"
        )}
      >
        {label ? <span className="text-muted-foreground">{label}</span> : null}
        <span>{active?.label ?? options[0]?.label ?? "Filter"}</span>
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>
      {open ? (
        <div
          className={cn(
            "app-pop-in absolute top-full z-40 mt-1.5 min-w-[180px] rounded-[7px] border border-line bg-popover p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                update(param, option.value);
                setOpen(false);
              }}
              className={cn(
                "flex h-7 w-full items-center justify-between gap-3 rounded-[5px] px-2 text-left text-[12px] transition-colors hover:bg-white/[0.05]",
                option.value === value ? "text-ink" : "text-[#c2cde0]"
              )}
            >
              <span>{option.label}</span>
              {option.value === value ? <Check className="size-3 text-[#53d2e5]" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-0.5 rounded-[6px] border border-line bg-surface-2 p-0.5", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-6 rounded-[4px] px-2 text-[11px] font-medium transition-colors",
            value === option.value
              ? "bg-surface-3 text-ink shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              : "text-muted-foreground hover:text-ink"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function TabNav<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto border-b border-line app-scroll", className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative -mb-px inline-flex h-9 shrink-0 items-center gap-1.5 border-b px-2.5 text-[12px] font-medium transition-colors",
            value === tab.value
              ? "border-[#53d2e5] text-ink"
              : "border-transparent text-muted-foreground hover:text-ink"
          )}
        >
          {tab.label}
          {typeof tab.count === "number" ? (
            <span className="rounded-[4px] bg-white/[0.05] px-1 text-[10px] tabular text-muted-foreground">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  defaultChecked = false,
  label,
  description,
  onChange,
  className,
}: {
  defaultChecked?: boolean;
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
  className?: string;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      {label || description ? (
        <div className="min-w-0">
          {label ? <p className="text-[12px] font-medium text-ink">{label}</p> : null}
          {description ? <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label ?? "Toggle"}
        onClick={() => {
          setChecked((value) => {
            onChange?.(!value);
            return !value;
          });
        }}
        className={cn(
          "relative mt-0.5 h-[18px] w-[32px] shrink-0 rounded-full border transition-colors",
          checked ? "border-[#006ec3] bg-[#006ec3]" : "border-line bg-surface-3"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-white transition-transform",
            checked ? "translate-x-[15px]" : "translate-x-[2px]"
          )}
        />
      </button>
    </div>
  );
}
