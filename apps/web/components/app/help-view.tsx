"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, CircleHelp, Mail, MessageSquare, Search, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@recallpilot/ui";
import { PageHeader, Panel, PanelHeader, StatusBadge } from "./ui";
import { CopyButton } from "./client-ui";

interface Faq {
  category: string;
  question: string;
  answer: string;
}

const FAQS: Faq[] = [
  {
    category: "Getting started",
    question: "How does RecallPilot decide who is due for recall?",
    answer:
      "Each patient gets a recall due date from their last visit plus the interval for their last treatment type. If the practice supplied an explicit next recall date, that takes precedence. Patients with no visit date are excluded from the recall queue until the record is completed.",
  },
  {
    category: "Patients & imports",
    question: "Which practice systems can I import from?",
    answer:
      "Any CSV export works. The import mapper detects delimiters and encodings, then lets you map columns from Dentally, Cliniko, Open Dental, CS Studio, R4 or a custom PMS export. Mapping profiles can be reused for repeat imports.",
  },
  {
    category: "Patients & imports",
    question: "What happens to the original CSV file?",
    answer:
      "The raw upload is stored only for validation and is purged on the workspace retention schedule. Row-level validation errors remain available for download for the retention window so you can correct the source file.",
  },
  {
    category: "Campaigns",
    question: "Does RecallPilot send messages automatically?",
    answer:
      "Campaigns are sequenced, but every send respects channel consent, opt-outs and quiet hours. You can review and pause a campaign at any time. In this workspace, drafts are created in Conversations and must be confirmed before delivery.",
  },
  {
    category: "Campaigns",
    question: "How is recoverable revenue calculated?",
    answer:
      "RecallPilot multiplies due patients by the average production assumption for their treatment type. Recovered revenue is attributed when a completed appointment is linked back to a recall conversation or campaign. Every estimate is directional, not a guarantee.",
  },
  {
    category: "Billing & privacy",
    question: "Can I revoke a shared audit link?",
    answer:
      "Yes. Open the audit from Revenue recovery or the overview, then revoke the link. Revocation is immediate, and the share token cannot be reused. Links also expire automatically after the workspace TTL.",
  },
  {
    category: "Billing & privacy",
    question: "Who can see patient data?",
    answer:
      "Only members of the workspace can access patient records. Audit share links expose aggregate counts and assumptions, never the raw patient list. Every export or revocation is written to the workspace audit log.",
  },
  {
    category: "Getting started",
    question: "Can I use my own SMS and email sender?",
    answer:
      "Yes. Email can be delivered through Resend, and SMS through a connected Twilio account. The sender identity, quiet hours and opt-out handling are configured per workspace in Integrations.",
  },
];

const CATEGORIES = ["All", "Getting started", "Patients & imports", "Campaigns", "Billing & privacy"];

export function HelpView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [open, setOpen] = useState<string | null>(FAQS[0]?.question ?? null);

  const filtered = FAQS.filter((faq) => {
    if (category !== "All" && faq.category !== category) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return faq.question.toLowerCase().includes(needle) || faq.answer.toLowerCase().includes(needle);
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Help & support" description="Guides, answers and a direct line to the RecallPilot team." />

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { icon: BookOpen, title: "Getting started", description: "Import your first patient list and run an audit.", href: "/app/import" },
          { icon: Sparkles, title: "Ask the AI assistant", description: "Get answers grounded in your workspace data.", href: "/app/assistant" },
          { icon: MessageSquare, title: "Talk to support", description: "Response within one business day.", href: "#contact" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.title} href={item.href} className="app-panel group p-4 transition-colors hover:bg-surface-2">
              <span className="flex size-8 items-center justify-center rounded-[6px] border border-line bg-surface-2 text-[#8ed8ff]">
                <Icon className="size-4" />
              </span>
              <p className="mt-2.5 text-[12px] font-semibold text-ink">{item.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{item.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
        <Panel>
          <div className="border-b border-line px-3 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search help articles…"
                className="h-8 w-full rounded-[6px] border border-line bg-surface-2 pl-8 pr-2 text-[12px] text-ink outline-none placeholder:text-muted-foreground focus:border-[#006ec3]/60"
              />
            </div>
            <div className="mt-2 flex items-center gap-1 overflow-x-auto app-scroll">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "inline-flex h-6 shrink-0 items-center rounded-[4px] px-1.5 text-[10px] font-medium transition-colors",
                    category === item ? "bg-white/[0.07] text-ink" : "text-muted-foreground hover:bg-white/[0.04] hover:text-ink"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-line/60">
            {filtered.map((faq) => {
              const isOpen = open === faq.question;
              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : faq.question)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.018]"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground/60">{faq.category}</p>
                      <p className="mt-0.5 text-[12px] font-medium text-[#dedee1]">{faq.question}</p>
                    </div>
                    <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen ? <p className="px-4 pb-3 text-[11px] leading-relaxed text-muted-foreground">{faq.answer}</p> : null}
                </div>
              );
            })}
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <CircleHelp className="mx-auto size-5 text-muted-foreground/50" />
                <p className="mt-2 text-[12px] text-muted-foreground">No articles match your search.</p>
              </div>
            ) : null}
          </div>
        </Panel>

        <div className="space-y-4">
          <div id="contact">
          <Panel>
            <PanelHeader title="Contact support" description="For workspace-specific issues." />
            <div className="space-y-3 px-4 py-3.5">
              <div className="flex items-center justify-between gap-2 rounded-[6px] border border-line bg-white/[0.015] px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 text-[#53d2e5]" />
                  <span className="text-[11px] text-[#c7c7cd]">support@recallpilot.com</span>
                </div>
                <CopyButton value="support@recallpilot.com" iconOnly label="Copy support email" className="h-5 w-5" />
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Include the workspace name and a patient or campaign reference. We never ask for patient data by email.
              </p>
            </div>
          </Panel>
          </div>

          <Panel>
            <PanelHeader title="System status" />
            <div className="space-y-2.5 px-4 py-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Application</span>
                <StatusBadge status="active" label="Operational" />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Email delivery</span>
                <StatusBadge status="active" label="Operational" />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">SMS delivery</span>
                <StatusBadge status="active" label="Operational" />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Imports</span>
                <StatusBadge status="active" label="Operational" />
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-start gap-2 px-4 py-3">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#83e0b3]" />
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                RecallPilot handles patient data under a data processing agreement. Audit exports contain aggregate values only.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
