"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CircleDollarSign,
  CornerDownLeft,
  Megaphone,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@recallpilot/ui";
import { Avatar, RecallBadge } from "./ui";

export interface AssistantPatient {
  id: string;
  name: string;
  firstName: string;
  status: string;
  recallDue: string | null;
  treatmentLabel: string;
  locationName: string | null;
}

export interface AssistantContextData {
  userName: string;
  totalPatients: number;
  duePatients: number;
  overdue: number;
  lapsed: number;
  recovered: number;
  conversionRate: number;
  insightHeadline: string;
  insightBody: string;
  patients: AssistantPatient[];
  campaigns: Array<{ name: string; status: string; targetCount: number; responseRate: number; recovered: number }>;
  pendingValue: number;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  sources?: string[];
  actions?: Array<{ label: string; href: string }>;
}

const SUGGESTIONS = [
  { icon: Users, title: "Analyze the recall backlog", prompt: "Analyze the recall backlog and tell me where to focus this week." },
  { icon: MessageSquare, title: "Draft a hygiene recall SMS", prompt: "Draft a short SMS for a hygiene recall patient with two appointment options." },
  { icon: Megaphone, title: "Review campaign performance", prompt: "Which recall campaign is underperforming and what should I change?" },
  { icon: CircleDollarSign, title: "Find revenue opportunities", prompt: "Find the highest-value revenue recovery opportunities in the current queue." },
];

function formatEuro(value: number): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export function AssistantView({ context }: { context: AssistantContextData }) {
  const firstName = context.userName.split(" ")[0] || "there";
  const initialMessage: ChatMessage = {
    id: "welcome",
    role: "assistant",
    content: `Good morning, ${firstName}. I reviewed ${context.totalPatients.toLocaleString("en-US")} patient records and ${context.campaigns.length} recall campaigns. ${context.insightHeadline}. ${context.insightBody} I can turn that into a sequence, a message draft or a focused patient list.`,
    sources: [`Patients · ${context.totalPatients.toLocaleString("en-US")} records`, `Campaigns · ${context.campaigns.length} rules`],
    actions: [
      { label: "Open recall queue", href: "/app/patients?status=needs_recall" },
      { label: "View campaigns", href: "/app/campaigns" },
    ],
  };
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patient = context.patients.find((item) => item.id === patientId) ?? null;

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const respond = (prompt: string, focus: AssistantPatient | null) => {
    const lower = prompt.toLowerCase();
    if (lower.includes("sms") || lower.includes("draft") || lower.includes("message")) {
      return {
        content: focus
          ? `Here's a draft for ${focus.name}, written for ${focus.treatmentLabel.toLowerCase()} recall. It offers two concrete times and keeps the tone personal.\n\n“Hi ${focus.firstName || "there"}, this is Bright Dental. Your ${focus.treatmentLabel.toLowerCase()} recall is due and we'd love to get you scheduled. We have Tuesday at 9:30am or Thursday at 2:30pm — which works better for you?”`
          : `Here's a reusable hygiene recall draft. It works best for patients with SMS consent and no reply yet.\n\n“Hi {{first_name}}, this is Bright Dental. Our records show your hygiene recall is due. We have two openings this week — would you like us to hold one for you?”\n\nI can adapt the tone for email or a more clinical follow-up.`,
          sources: ["Consent · SMS + email", "Campaign · 3-touch sequence"],
          actions: [{ label: "Open conversations", href: "/app/conversations" }],
        };
    }
    if (lower.includes("campaign") || lower.includes("underperform")) {
      const weakest = [...context.campaigns].sort((a, b) => a.responseRate - b.responseRate)[0];
      return {
        content: weakest
          ? `${weakest.name} has the lowest response rate at ${weakest.responseRate}% across ${weakest.targetCount.toLocaleString("en-US")} patients. I'd shorten the first touch to one question, send it on a Tuesday morning, and stop the sequence after a reply. The second-touch copy is the likely drag — it repeats the ask instead of offering specific times.`
          : "There are no active campaigns yet. Create a hygiene campaign first and I can benchmark its response rate.",
        sources: ["Campaigns · live rules", "Patients · consent state"],
        actions: [{ label: "Open campaigns", href: "/app/campaigns" }],
      };
    }
    if (lower.includes("revenue") || lower.includes("opportunit") || lower.includes("value")) {
      return {
        content: `The open recall queue represents about ${formatEuro(context.pendingValue)} in estimated production. The highest-leverage group is the ${context.overdue.toLocaleString("en-US")} overdue patients — they already know the practice and are past due. A two-message sequence to that group would likely recover more than expanding the audience.`,
        sources: ["Revenue · modeled attribution", "Patients · recall status"],
        actions: [
          { label: "Open revenue recovery", href: "/app/revenue" },
          { label: "Review overdue", href: "/app/patients?status=overdue" },
        ],
      };
    }
    if (lower.includes("backlog") || lower.includes("recall") || lower.includes("focus")) {
      const top = context.patients[0];
      return {
        content: `Your queue has ${context.duePatients.toLocaleString("en-US")} patients, including ${context.overdue.toLocaleString("en-US")} overdue and ${context.lapsed.toLocaleString("en-US")} lapsed. Start with the overdue group at ${top?.locationName ?? "Central Clinic"} — most have SMS consent. A focused sequence this week should clear the oldest third before it ages further.`,
        sources: ["Patients · recall window", "Consent · SMS + email"],
        actions: [
          { label: "Review overdue", href: "/app/patients?status=overdue" },
          { label: "Open lapsed", href: "/app/patients?status=lapsed" },
        ],
      };
    }
    return {
      content: `I can help with recall prioritization, campaign copy, patient-level context and revenue opportunities. ${focus ? `Right now I have ${focus.name} in focus (${focus.status.replace("_", " ")}, due ${focus.recallDue ?? "unknown"}).` : "Pick a patient from the context panel to make the next answer more specific."}`,
      sources: ["Workspace · recall operations"],
      actions: [{ label: "Open overview", href: "/app/overview" }],
    };
  };

  const send = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || thinking) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setThinking(true);
    const focus = patient;
    timerRef.current = setTimeout(() => {
      const result = respond(trimmed, focus);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.content,
          sources: result.sources,
          actions: result.actions,
        },
      ]);
      setThinking(false);
    }, 650);
  };

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessages([initialMessage]);
    setThinking(false);
    setInput("");
    setPatientId(null);
  };

  return (
    <div className="app-panel overflow-hidden">
      <div className="grid h-[calc(100vh-158px)] min-h-[600px] lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="hidden flex-col border-r border-line lg:flex">
          <div className="border-b border-line px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">Workspace context</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <div className="rounded-[5px] border border-line bg-surface-2 px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground/70">Due</p>
                <p className="mt-0.5 tabular text-[13px] font-semibold text-ink">{context.duePatients.toLocaleString("en-US")}</p>
              </div>
              <div className="rounded-[5px] border border-line bg-surface-2 px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground/70">Recovered</p>
                <p className="mt-0.5 tabular text-[11px] font-semibold text-ink">{formatEuro(context.recovered)}</p>
              </div>
              <div className="rounded-[5px] border border-line bg-surface-2 px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground/70">Conv.</p>
                <p className="mt-0.5 tabular text-[13px] font-semibold text-ink">{context.conversionRate}%</p>
              </div>
            </div>
          </div>

          <div className="border-b border-line px-3 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">Patient focus</p>
              {patient ? (
                <button type="button" onClick={() => setPatientId(null)} className="text-[9px] text-muted-foreground hover:text-ink">
                  Clear
                </button>
              ) : null}
            </div>
            <div className="mt-1.5 space-y-0.5">
              {context.patients.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPatientId(item.id === patientId ? null : item.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[5px] px-1.5 py-1.5 text-left transition-colors",
                    item.id === patientId ? "bg-[#232326]" : "hover:bg-white/[0.035]"
                  )}
                >
                  <Avatar name={item.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[11px] font-medium", item.id === patientId ? "text-ink" : "text-[#c7c7cd]")}>{item.name}</span>
                    <span className="block truncate text-[9px] text-muted-foreground">{item.treatmentLabel} · due {item.recallDue ?? "—"}</span>
                  </span>
                  <RecallBadge status={item.status} className="px-1 py-0 text-[8px]" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 app-scroll">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">Suggested prompts</p>
            <div className="mt-1.5 space-y-0.5">
              {SUGGESTIONS.map((suggestion) => {
                const Icon = suggestion.icon;
                return (
                  <button
                    key={suggestion.title}
                    type="button"
                    onClick={() => send(suggestion.prompt)}
                    className="flex w-full items-start gap-2 rounded-[5px] px-1.5 py-1.5 text-left transition-colors hover:bg-white/[0.035]"
                  >
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-[#53d2e5]" />
                    <span className="text-[11px] leading-snug text-[#c7c7cd]">{suggestion.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-line px-3 py-2.5">
            <p className="text-[9px] leading-relaxed text-muted-foreground/60">
              RecallPilot AI uses workspace recall, consent and campaign data. It never sends messages without confirmation.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <div className="flex h-12 items-center justify-between border-b border-line px-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-[5px] border border-[#53d2e5]/20 bg-[#53d2e5]/10 text-[#53d2e5]">
                <Sparkles className="size-3.5" />
              </span>
              <div>
                <p className="text-[12px] font-medium text-ink">RecallPilot AI</p>
                <p className="text-[9px] text-muted-foreground">Grounded in workspace data</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {patient ? (
                <span className="hidden items-center gap-1 rounded-[4px] border border-[#53d2e5]/20 bg-[#53d2e5]/[0.06] px-1.5 py-0.5 text-[9px] text-[#a9e7f1] sm:inline-flex">
                  Focus · {patient.name}
                </span>
              ) : null}
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-line px-2 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-ink"
              >
                <RotateCcw className="size-3" /> New thread
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 app-scroll">
            {messages.map((message) =>
              message.role === "assistant" ? (
                <div key={message.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[5px] border border-[#53d2e5]/20 bg-[#53d2e5]/10 text-[#53d2e5]">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="min-w-0 max-w-[78%]">
                    <div className="rounded-[7px] border border-line bg-surface-2 px-3 py-2.5 text-[12px] leading-relaxed text-[#dedee1] whitespace-pre-line">
                      {message.content}
                    </div>
                    {message.sources?.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {message.sources.map((source) => (
                          <span key={source} className="inline-flex items-center gap-1 rounded-[4px] border border-line px-1.5 py-0.5 text-[9px] text-muted-foreground">
                            <span className="size-1 rounded-full bg-[#53d2e5]" /> {source}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {message.actions?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {message.actions.map((action) => (
                          <Link
                            key={action.label}
                            href={action.href}
                            className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-line px-1.5 text-[10px] font-medium text-[#c4c4ca] transition-colors hover:bg-white/[0.05] hover:text-ink"
                          >
                            {action.label} <ArrowUpRight className="size-2.5" />
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[74%] rounded-[7px] bg-[#333338] px-3 py-2.5 text-[12px] leading-relaxed text-[#ececf0]">{message.content}</div>
                </div>
              )
            )}
            {thinking ? (
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[5px] border border-[#53d2e5]/20 bg-[#53d2e5]/10 text-[#53d2e5]">
                  <Sparkles className="size-3.5" />
                </span>
                <div className="flex h-9 items-center gap-1 rounded-[7px] border border-line bg-surface-2 px-3">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#53d2e5]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-[#53d2e5] [animation-delay:120ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-[#53d2e5] [animation-delay:240ms]" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-line p-2.5">
            <div className="mb-1.5 flex items-center gap-1 overflow-x-auto app-scroll lg:hidden">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.title}
                  type="button"
                  onClick={() => send(suggestion.prompt)}
                  className="shrink-0 rounded-[4px] border border-line px-1.5 py-0.5 text-[9px] text-muted-foreground hover:bg-white/[0.05] hover:text-ink"
                >
                  {suggestion.title}
                </button>
              ))}
            </div>
            <div className="rounded-[6px] border border-line bg-surface-2 focus-within:border-[#006ec3]/60">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send(input);
                  }
                }}
                rows={2}
                placeholder={patient ? `Ask about ${patient.name}…` : "Ask about recalls, campaigns, revenue or patients…"}
                className="w-full resize-none bg-transparent px-2.5 pt-2 text-[12px] leading-relaxed text-ink outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between px-2.5 pb-1.5">
                <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <CornerDownLeft className="size-2.5" /> Enter to send · Shift+Enter for a new line
                </span>
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={!input.trim() || thinking}
                  className="inline-flex h-6 items-center gap-1 rounded-[4px] bg-[#006ec3] px-2 text-[10px] font-medium text-white transition-colors hover:bg-[#0a7bd4] disabled:pointer-events-none disabled:opacity-40"
                >
                  <Send className="size-3" /> Send
                </button>
              </div>
            </div>
            <p className="mt-1 text-center text-[9px] text-muted-foreground/60">AI can make mistakes. Review drafts before sending.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
