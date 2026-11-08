"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarPlus,
  Check,
  Copy,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Search,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import { cn } from "@recallpilot/ui";
import type { ConversationMessage, ConversationThread } from "@/lib/app-data";
import { formatCurrency, formatDate, relativeDay, timeAgo } from "@/lib/format";
import { Avatar, RecallBadge, StatusBadge } from "./ui";
import { CopyButton, DropdownMenu } from "./client-ui";

type Filter = "all" | "unread" | "awaiting" | "booked";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "awaiting", label: "Awaiting" },
  { value: "booked", label: "Booked" },
];

export function ConversationsView({
  threads,
  initialPatientId,
}: {
  threads: ConversationThread[];
  initialPatientId?: string;
}) {
  const initial = threads.find((thread) => thread.patient.id === initialPatientId) ?? threads[0];
  const [selectedId, setSelectedId] = useState(initial?.id ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [composer, setComposer] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(Boolean(initialPatientId));
  const [messages, setMessages] = useState<Record<string, ConversationMessage[]>>(() =>
    Object.fromEntries(threads.map((thread) => [thread.id, thread.messages]))
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = threads.find((thread) => thread.id === selectedId) ?? initial;
  const selectedMessages = selected ? messages[selected.id] ?? [] : [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return threads.filter((thread) => {
      if (filter === "unread" && !thread.unread) return false;
      if (filter === "awaiting" && thread.status !== "awaiting") return false;
      if (filter === "booked" && thread.status !== "booked") return false;
      if (!needle) return true;
      return (
        thread.patient.name.toLowerCase().includes(needle) ||
        thread.preview.toLowerCase().includes(needle) ||
        (thread.patient.phone ?? "").includes(needle) ||
        (thread.patient.email ?? "").toLowerCase().includes(needle)
      );
    });
  }, [threads, filter, query]);

  const counts = useMemo(
    () => ({
      all: threads.length,
      unread: threads.filter((thread) => thread.unread).length,
      awaiting: threads.filter((thread) => thread.status === "awaiting").length,
      booked: threads.filter((thread) => thread.status === "booked").length,
    }),
    [threads]
  );

  useEffect(() => {
    setComposer("");
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [selectedId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [selectedMessages.length]);

  if (!selected) {
    return (
      <div className="app-panel flex h-[60vh] items-center justify-center text-[13px] text-muted-foreground">
        No conversations yet.
      </div>
    );
  }

  const suggestion =
    selected.status === "booked"
      ? `Great — I've booked you in. We'll send a confirmation with the details. See you soon.`
      : selected.status === "awaiting"
        ? `Hi ${selected.patient.firstName || "there"}, just checking in — would Thursday morning or Friday afternoon work better for your recall visit?`
        : `Thanks for getting back to me. We have Tuesday 9:30am and Thursday 2:30pm available — which works best?`;

  const send = () => {
    const body = composer.trim();
    if (!body) return;
    setMessages((current) => ({
      ...current,
      [selected.id]: [
        ...(current[selected.id] ?? []),
        {
          id: `local-${Date.now()}`,
          direction: "outbound",
          body,
          at: new Date(),
          channel: selected.channel,
        },
      ],
    }));
    setComposer("");
  };

  return (
    <div className="app-panel overflow-hidden">
      <div className="grid h-[calc(100vh-158px)] min-h-[580px] xl:grid-cols-[300px_minmax(0,1fr)_272px]">
        <aside className={cn("min-w-0 flex-col border-r border-line", mobileThreadOpen ? "hidden xl:flex" : "flex")}>
          <div className="border-b border-line px-3 pb-2 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[15px] font-semibold text-ink">Conversations</h1>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{counts.awaiting} awaiting a reply</p>
              </div>
              <Link
                href="/app/assistant"
                className="inline-flex size-7 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-ink"
                aria-label="Open AI assistant"
              >
                <Sparkles className="size-3.5" />
              </Link>
            </div>
            <div className="relative mt-2.5">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search conversations…"
                className="h-7 w-full rounded-[5px] border border-line bg-surface-2 pl-8 pr-2 text-[11px] text-ink outline-none placeholder:text-muted-foreground focus:border-[#2a4a78]"
              />
            </div>
            <div className="mt-2 flex items-center gap-1 overflow-x-auto app-scroll">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    "inline-flex h-6 shrink-0 items-center gap-1 rounded-[4px] px-1.5 text-[10px] font-medium transition-colors",
                    filter === item.value ? "bg-white/[0.07] text-ink" : "text-muted-foreground hover:bg-white/[0.04] hover:text-ink"
                  )}
                >
                  {item.label}
                  <span className="tabular text-[9px] opacity-70">{counts[item.value]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto app-scroll">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-[11px] text-muted-foreground">No conversations match.</p>
            ) : (
              filtered.map((thread) => {
                const active = thread.id === selected.id;
                const threadMessages = messages[thread.id] ?? [];
                const preview = threadMessages[threadMessages.length - 1]?.body ?? thread.preview;
                const lastAt = threadMessages[threadMessages.length - 1]?.at ?? thread.lastAt;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(thread.id);
                      setMobileThreadOpen(true);
                    }}
                    className={cn(
                      "relative flex w-full items-start gap-2.5 border-b border-line/60 px-3 py-2.5 text-left transition-colors",
                      active ? "bg-[#0b1b34]" : "hover:bg-white/[0.02]"
                    )}
                  >
                    {active ? <span className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-[#53d2e5]" /> : null}
                    <div className="relative shrink-0">
                      <Avatar name={thread.patient.name} size="sm" />
                      {thread.unread ? <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[#53d2e5] ring-2 ring-surface-1" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-[11px] font-medium", thread.unread ? "text-ink" : "text-[#c5d2e8]")}>{thread.patient.name}</span>
                        <span className="shrink-0 text-[9px] text-muted-foreground/70">{timeAgo(lastAt)}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{preview}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground/70">
                          {thread.channel === "SMS" ? <MessageSquare className="size-2.5" /> : <Mail className="size-2.5" />}
                          {thread.channel}
                        </span>
                        <StatusBadge status={thread.status} className="px-1 py-0 text-[8px]" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className={cn("min-w-0 flex-col", mobileThreadOpen ? "flex" : "hidden xl:flex")}>
          <div className="flex h-12 items-center justify-between gap-2 border-b border-line px-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileThreadOpen(false)}
                aria-label="Back to conversations"
                className="inline-flex size-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-white/[0.05] hover:text-ink xl:hidden"
              >
                <ArrowLeft className="size-4" />
              </button>
              <Avatar name={selected.patient.name} size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Link href={`/app/patients/${selected.patient.id}`} className="truncate text-[12px] font-medium text-ink hover:underline">
                    {selected.patient.name}
                  </Link>
                  <RecallBadge status={selected.patient.recallStatus} className="hidden sm:inline-flex" />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {selected.channel} · {selected.patient.phone ?? selected.patient.email ?? "No contact"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/app/appointments?patient=${selected.patient.id}`}
                className="hidden h-7 items-center gap-1 rounded-[5px] border border-line px-2 text-[10px] font-medium text-[#c2cde0] transition-colors hover:bg-white/[0.05] hover:text-ink sm:inline-flex"
              >
                <CalendarPlus className="size-3" /> Schedule
              </Link>
              <DropdownMenu
                align="end"
                ariaLabel="Conversation actions"
                trigger={
                  <span className="inline-flex size-7 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-ink">
                    <MoreHorizontal className="size-4" />
                  </span>
                }
                items={[
                  { label: "View patient", href: `/app/patients/${selected.patient.id}`, icon: <UserRound /> },
                  { label: "Schedule appointment", href: `/app/appointments?patient=${selected.patient.id}`, icon: <CalendarPlus /> },
                  {
                    label: "Copy phone number",
                    icon: <Copy />,
                    disabled: !selected.patient.phone,
                    onSelect: () => {
                      if (selected.patient.phone) void navigator.clipboard.writeText(selected.patient.phone);
                    },
                  },
                ]}
              />
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 app-scroll">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground/60">Recall conversation</span>
              <div className="h-px flex-1 bg-line" />
            </div>
            {selectedMessages.map((message) => (
              <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[78%]">
                  <div
                    className={`rounded-[7px] px-2.5 py-2 text-[12px] leading-relaxed ${
                      message.direction === "outbound"
                        ? "bg-[#0b3560] text-[#e8f2ff]"
                        : "border border-line bg-surface-2 text-[#c5d2e8]"
                    }`}
                  >
                    {message.body}
                  </div>
                  <p className={`mt-1 text-[9px] text-muted-foreground/70 ${message.direction === "outbound" ? "text-right" : ""}`}>
                    {formatDate(message.at, "d MMM · HH:mm")}
                    {message.direction === "outbound" ? " · Delivered" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-line p-2.5">
            <div className="mb-1.5 flex items-center gap-1 overflow-x-auto app-scroll">
              {["Offer two times", "Confirm booking", "Reschedule"].map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() =>
                    setComposer(
                      template === "Offer two times"
                        ? `Hi ${selected.patient.firstName || "there"}, we have Tuesday 9:30am or Thursday 2:30pm available — which works best?`
                        : template === "Confirm booking"
                          ? `You're all set — we've booked your ${selected.patient.treatmentLabel.toLowerCase()} appointment. See you soon!`
                          : `No problem — let me know a day that works and I'll find a time for you.`
                    )
                  }
                  className="shrink-0 rounded-[4px] border border-line px-1.5 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-ink"
                >
                  {template}
                </button>
              ))}
            </div>
            <div className="rounded-[6px] border border-line bg-surface-2 focus-within:border-[#2a4a78]">
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder={`Reply via ${selected.channel.toLowerCase()}…`}
                className="w-full resize-none bg-transparent px-2.5 pt-2 text-[12px] leading-relaxed text-ink outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between px-2.5 pb-1.5">
                <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Check className="size-2.5 text-[#5bd39a]" /> Consent on file · quiet hours respected
                </span>
                <button
                  type="button"
                  onClick={send}
                  disabled={!composer.trim()}
                  className="inline-flex h-6 items-center gap-1 rounded-[4px] bg-[#006ec3] px-2 text-[10px] font-medium text-white transition-colors hover:bg-[#0a7bd4] disabled:pointer-events-none disabled:opacity-40"
                >
                  <Send className="size-3" /> Send
                </button>
              </div>
            </div>
            <p className="mt-1 text-center text-[9px] text-muted-foreground/60">Messages are delivered through the practice&apos;s connected channel.</p>
          </div>
        </section>

        <aside className="hidden min-w-0 flex-col border-l border-line xl:flex">
          <div className="border-b border-line px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">Patient context</p>
            <div className="mt-2 flex items-center gap-2">
              <Avatar name={selected.patient.name} size="md" />
              <div className="min-w-0">
                <Link href={`/app/patients/${selected.patient.id}`} className="block truncate text-[12px] font-medium text-ink hover:underline">
                  {selected.patient.name}
                </Link>
                <p className="text-[10px] text-muted-foreground">{selected.patient.locationName ?? "Unassigned location"}</p>
              </div>
            </div>
          </div>

          <div className="border-b border-line px-3 py-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Recall status</span>
                <RecallBadge status={selected.patient.recallStatus} />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Recall due</span>
                <span className="text-[#c5d2e8]">{relativeDay(selected.patient.recallDue)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Last visit</span>
                <span className="text-[#c5d2e8]">{relativeDay(selected.patient.lastVisitAt)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Est. value</span>
                <span className="tabular text-[#c5d2e8]">{formatCurrency(selected.patient.estimatedValue)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Campaign</span>
                <span className="truncate pl-2 text-right text-[#c5d2e8]">{selected.patient.treatmentLabel} recall</span>
              </div>
            </div>
            <Link
              href={`/app/patients/${selected.patient.id}`}
              className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-[#8ed8ff] hover:text-[#53d2e5]"
            >
              Open full profile <ArrowUpRight className="size-2.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto p-3 app-scroll">
            <div className="rounded-[6px] border border-[#53d2e5]/15 bg-[#53d2e5]/[0.025] p-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[#53d2e5]" />
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#7fd8e7]">Suggested reply</p>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{suggestion}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setComposer(suggestion)}
                  className="inline-flex h-6 items-center gap-1 rounded-[4px] bg-[#006ec3] px-2 text-[9px] font-medium text-white hover:bg-[#0a7bd4]"
                >
                  Use reply
                </button>
                <CopyButton value={suggestion} label="Copy" className="h-6 text-[9px]" />
              </div>
            </div>

            <div className="mt-3 rounded-[6px] border border-line bg-white/[0.012] p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Conversation</p>
              <div className="mt-1.5 space-y-1.5 text-[10px] text-muted-foreground">
                <p className="flex items-center justify-between gap-2">
                  <span>Channel</span>
                  <span className="text-[#c5d2e8]">{selected.channel}</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span>Status</span>
                  <span className="text-[#c5d2e8]">{selected.status}</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span>Last message</span>
                  <span className="text-[#c5d2e8]">{timeAgo(selected.lastAt)}</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span>Location</span>
                  <span className="truncate text-right text-[#c5d2e8]">{selected.patient.locationName ?? "—"}</span>
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
