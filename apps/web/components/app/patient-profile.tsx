"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck2,
  CalendarPlus,
  Check,
  ChevronRight,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import type { PatientProfile } from "@/lib/app-data";
import { formatCurrency, formatDate, relativeDay, timeAgo } from "@/lib/format";
import { Avatar, Bar, Panel, PanelHeader, RecallBadge, StatusBadge } from "./ui";
import { CopyButton, TabNav, type DropdownItem } from "./client-ui";
import { DropdownMenu } from "./client-ui";

type TabValue = "overview" | "appointments" | "recalls" | "conversations" | "treatment" | "activity";

const TABS: Array<{ value: TabValue; label: string; count?: number }> = [
  { value: "overview", label: "Overview" },
  { value: "appointments", label: "Appointments" },
  { value: "recalls", label: "Recalls" },
  { value: "conversations", label: "Conversations" },
  { value: "treatment", label: "Treatment" },
  { value: "activity", label: "Activity" },
];

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 py-2 last:border-0">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-[12px] text-[#c7c7cd]">{children}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">{children}</p>;
}

export function PatientProfileView({ profile }: { profile: PatientProfile }) {
  const [tab, setTab] = useState<TabValue>("overview");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(profile.conversation.messages);
  const [sent, setSent] = useState(false);
  const { patient } = profile;
  const applySuggestion = (text: string) => {
    setDraft(text);
    setTab("conversations");
  };
  const consentEmail = profile.consents.find((item) => item.channel === "email")?.granted ?? false;
  const consentSms = profile.consents.find((item) => item.channel === "sms")?.granted ?? false;
  const bestChannel = consentSms ? "SMS" : consentEmail ? "email" : null;

  const moreItems: DropdownItem[] = [
    {
      label: "Copy email address",
      icon: <Mail />,
      disabled: !patient.email,
      onSelect: () => {
        if (patient.email) void navigator.clipboard.writeText(patient.email);
      },
    },
    {
      label: "Copy phone number",
      icon: <Phone />,
      disabled: !patient.phone,
      onSelect: () => {
        if (patient.phone) void navigator.clipboard.writeText(patient.phone);
      },
    },
    { label: "Open conversation", href: `/app/conversations?patient=${patient.id}`, icon: <MessageSquare /> },
    { label: "Schedule appointment", href: `/app/appointments?patient=${patient.id}`, icon: <CalendarPlus /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={patient.name} size="lg" className="mt-0.5 size-11 text-[13px]" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[21px] font-semibold tracking-[-0.02em] text-ink">{patient.name}</h1>
              <RecallBadge status={patient.recallStatus} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
              <span>{patient.treatmentLabel} recall</span>
              <span className="text-[#454549]">·</span>
              <span>{patient.locationName ?? "Unassigned location"}</span>
              <span className="text-[#454549]">·</span>
              <span>{patient.providerName ?? "No provider"}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/app/conversations?patient=${patient.id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#006ec3] px-2.5 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors hover:bg-[#0a7bd4]"
          >
            <MessageSquare className="size-3.5" /> Message patient
          </Link>
          <Link
            href={`/app/appointments?patient=${patient.id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line bg-white/[0.02] px-2.5 text-[12px] font-medium text-[#c4c4ca] transition-colors hover:bg-white/[0.05] hover:text-ink"
          >
            <CalendarPlus className="size-3.5" /> Schedule
          </Link>
          <DropdownMenu
            align="end"
            ariaLabel="More patient actions"
            trigger={
              <span className="inline-flex size-8 items-center justify-center rounded-[6px] border border-line bg-white/[0.02] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-ink">
                <ChevronRight className="size-3.5 rotate-90" />
              </span>
            }
            items={moreItems}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <Panel>
          <TabNav tabs={TABS} value={tab} onChange={setTab} className="px-2" />
          <div className="p-4">
            {tab === "overview" ? (
              <OverviewTab profile={profile} consentEmail={consentEmail} consentSms={consentSms} onUseSuggestion={applySuggestion} />
            ) : null}
            {tab === "appointments" ? <AppointmentsTab profile={profile} /> : null}
            {tab === "recalls" ? <RecallsTab profile={profile} /> : null}
            {tab === "conversations" ? (
              <ConversationsTab
                profile={profile}
                draft={draft}
                setDraft={setDraft}
                messages={messages}
                setMessages={setMessages}
                sent={sent}
                setSent={setSent}
              />
            ) : null}
            {tab === "treatment" ? <TreatmentTab profile={profile} /> : null}
            {tab === "activity" ? <ActivityTab profile={profile} /> : null}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Patient details" />
            <div className="px-4 py-1">
              <DetailRow label="Email">
                {patient.email ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="truncate">{patient.email}</span>
                    <CopyButton value={patient.email} iconOnly label="Copy email" className="h-5 w-5" />
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </DetailRow>
              <DetailRow label="Phone">{patient.phone ?? <span className="text-muted-foreground">Not provided</span>}</DetailRow>
              <DetailRow label="Date of birth">{patient.birthDate ? formatDate(patient.birthDate) : "—"}</DetailRow>
              <DetailRow label="Location">{patient.locationName ?? "—"}</DetailRow>
              <DetailRow label="Provider">{patient.providerName ?? "—"}</DetailRow>
              <DetailRow label="Locale">{patient.locale.toUpperCase()}</DetailRow>
              <DetailRow label="Last visit">{relativeDay(patient.lastVisitAt)}</DetailRow>
              <DetailRow label="Next recall">
                <span className="text-[#c7c7cd]">{relativeDay(patient.recallDue)}</span>
              </DetailRow>
              <DetailRow label="Est. treatment value">
                <span className="tabular font-medium text-ink">{formatCurrency(profile.outstanding || patient.estimatedValue)}</span>
              </DetailRow>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Consent" description="Channel permissions on file." />
            <div className="space-y-2.5 px-4 py-3">
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5" /> Email
                </span>
                <span className={consentEmail ? "text-[#83e0b3]" : "text-muted-foreground"}>{consentEmail ? "Granted" : "Not granted"}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5" /> SMS
                </span>
                <span className={consentSms ? "text-[#83e0b3]" : "text-muted-foreground"}>{consentSms ? "Granted" : "Not granted"}</span>
              </div>
            </div>
          </Panel>

          <Panel className="border-[#53d2e5]/15">
            <div className="border-b border-line/70 bg-[#53d2e5]/[0.025] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[#53d2e5]" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7fd8e7]">AI suggestions</p>
              </div>
              <p className="mt-1 text-[12px] font-medium text-[#dedee1]">Next best action</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {!bestChannel
                  ? "This patient has no channel consent on file. Add consent before starting outreach."
                  : patient.recallStatus === "lapsed"
                    ? `This recall has aged past 90 days. A personal ${bestChannel} with two concrete times is the highest-converting option.`
                    : `Send a short ${bestChannel} with two appointment options. Patients with ${bestChannel} consent respond more often.`}
              </p>
            </div>
            <div className="space-y-2.5 p-3">
              {profile.suggestions.length === 0 ? (
                <p className="rounded-[6px] border border-dashed border-line p-3 text-[11px] text-muted-foreground">
                  No channel consent on file. Add email or SMS consent to generate a draft.
                </p>
              ) : null}
              {profile.suggestions.map((suggestion) => (
                <div key={suggestion.channel} className="rounded-[6px] border border-line bg-white/[0.015] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-[4px] bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {suggestion.channel}
                    </span>
                    <CopyButton value={suggestion.body} iconOnly label={`Copy ${suggestion.channel} draft`} className="h-5 w-5" />
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium text-[#dedee1]">{suggestion.subject}</p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">{suggestion.body}</p>
                  <button
                    type="button"
                    onClick={() => applySuggestion(suggestion.body)}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[#8ed8ff] transition-colors hover:text-[#53d2e5]"
                  >
                    Use in conversation <ArrowUpRight className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );

  function OverviewTab({
    profile: current,
    consentEmail: emailConsent,
    consentSms: smsConsent,
    onUseSuggestion,
  }: {
    profile: PatientProfile;
    consentEmail: boolean;
    consentSms: boolean;
    onUseSuggestion: (text: string) => void;
  }) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[6px] border border-line bg-white/[0.015] p-3">
            <SectionTitle>Recall status</SectionTitle>
            <div className="mt-2">
              <RecallBadge status={current.patient.recallStatus} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Due {relativeDay(current.patient.recallDue)}</p>
          </div>
          <div className="rounded-[6px] border border-line bg-white/[0.015] p-3">
            <SectionTitle>Outstanding value</SectionTitle>
            <p className="mt-1.5 tabular text-[18px] font-semibold text-ink">{formatCurrency(current.outstanding)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Estimate for this recall</p>
          </div>
          <div className="rounded-[6px] border border-line bg-white/[0.015] p-3">
            <SectionTitle>Contact consent</SectionTitle>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`rounded-[4px] border px-1.5 py-0.5 text-[10px] ${emailConsent ? "border-[#4cc38a]/25 bg-[#4cc38a]/10 text-[#83e0b3]" : "border-line text-muted-foreground"}`}>
                Email
              </span>
              <span className={`rounded-[4px] border px-1.5 py-0.5 text-[10px] ${smsConsent ? "border-[#4cc38a]/25 bg-[#4cc38a]/10 text-[#83e0b3]" : "border-line text-muted-foreground"}`}>
                SMS
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Channels on file</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle>Recent appointments</SectionTitle>
            <button type="button" onClick={() => setTab("appointments")} className="text-[11px] text-muted-foreground hover:text-ink">
              View all
            </button>
          </div>
          <AppointmentTable appointments={current.appointments.slice(0, 3)} compact />
        </div>

        {current.suggestions[0] ? (
          <div className="rounded-[6px] border border-[#53d2e5]/15 bg-[#53d2e5]/[0.025] p-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-[#53d2e5]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7fd8e7]">Suggested message</p>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{current.suggestions[0].body}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUseSuggestion(current.suggestions[0]?.body ?? "")}
                className="inline-flex h-6 items-center gap-1 rounded-[4px] bg-[#006ec3] px-2 text-[10px] font-medium text-white transition-colors hover:bg-[#0a7bd4]"
              >
                <MessageSquare className="size-3" /> Open in conversation
              </button>
              <CopyButton value={current.suggestions[0].body} label="Copy" className="h-6 text-[10px]" />
            </div>
          </div>
        ) : null}

        <div className="rounded-[6px] border border-line bg-white/[0.012] p-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Conversation</SectionTitle>
            <button type="button" onClick={() => setTab("conversations")} className="text-[11px] text-muted-foreground hover:text-ink">
              Open
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {current.conversation.messages.slice(-2).map((message) => (
              <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-[6px] px-2.5 py-1.5 text-[11px] leading-relaxed ${
                    message.direction === "outbound"
                      ? "bg-[#333338] text-[#ececf0]"
                      : "border border-line bg-surface-2 text-[#c7c7cd]"
                  }`}
                >
                  {message.body}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>Activity</SectionTitle>
          <div className="mt-2 divide-y divide-line/60">
            {current.timeline.slice(0, 6).map((item) => (
              <TimelineRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  function AppointmentsTab({ profile: current }: { profile: PatientProfile }) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-ink">Appointment history</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{current.appointments.length} visits from the practice system.</p>
          </div>
          <Link
            href={`/app/appointments?patient=${current.patient.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-line px-2 text-[11px] font-medium text-[#c4c4ca] hover:bg-white/[0.05] hover:text-ink"
          >
            <CalendarPlus className="size-3" /> Schedule
          </Link>
        </div>
        <AppointmentTable appointments={current.appointments} />
      </div>
    );
  }

  function RecallsTab({ profile: current }: { profile: PatientProfile }) {
    const recallRows = [
      {
        id: "current",
        label: "Current recall window",
        detail: `${current.campaign} · ${current.patient.treatmentLabel}`,
        date: current.patient.recallDue,
        status: current.patient.recallStatus,
      },
      {
        id: "last",
        label: "Last completed visit",
        detail: current.appointments[0]?.providerName ?? "Previous appointment",
        date: current.patient.lastVisitAt,
        status: "completed",
      },
      {
        id: "message",
        label: "Last outbound message",
        detail: current.conversation.channel,
        date: current.conversation.lastAt.toISOString(),
        status: current.conversation.status,
      },
    ];
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[6px] border border-line p-3">
            <SectionTitle>Recall due</SectionTitle>
            <p className="mt-1.5 text-[18px] font-semibold text-ink">{relativeDay(current.patient.recallDue)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(current.patient.recallDue)}</p>
          </div>
          <div className="rounded-[6px] border border-line p-3">
            <SectionTitle>Interval</SectionTitle>
            <p className="mt-1.5 text-[18px] font-semibold text-ink">
              {current.patient.recallIntervalMonths ?? (current.patient.treatment === "hygiene" ? 6 : 12)} mo
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">For {current.patient.treatmentLabel.toLowerCase()}</p>
          </div>
          <div className="rounded-[6px] border border-line p-3">
            <SectionTitle>Campaign</SectionTitle>
            <p className="mt-1.5 truncate text-[13px] font-semibold text-ink">{current.campaign}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Active sequence</p>
          </div>
        </div>
        <div>
          <SectionTitle>Recall timeline</SectionTitle>
          <div className="mt-2 divide-y divide-line/60">
            {recallRows.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#dedee1]">{row.label}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{row.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{row.date ? relativeDay(row.date) : "—"}</span>
                  <StatusBadge status={row.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[6px] border border-line bg-white/[0.015] p-3">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-muted-foreground" />
            <p className="text-[11px] font-medium text-[#dedee1]">Recall aging</p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            The patient is currently <span className="text-[#c7c7cd]">{current.patient.recallStatus.replace("_", " ")}</span>. Recall reminders
            are sequenced at day 0, 7 and 21.
          </p>
          <div className="mt-2">
            <Bar
              value={current.patient.recallStatus === "lapsed" ? 92 : current.patient.recallStatus === "overdue" ? 68 : 32}
              max={100}
              tone={current.patient.recallStatus === "lapsed" ? "muted" : "cyan"}
            />
          </div>
        </div>
      </div>
    );
  }

  function ConversationsTab({
    profile: current,
    draft,
    setDraft,
    messages,
    setMessages,
    sent,
    setSent,
  }: {
    profile: PatientProfile;
    draft: string;
    setDraft: (value: string) => void;
    messages: PatientProfile["conversation"]["messages"];
    setMessages: React.Dispatch<React.SetStateAction<PatientProfile["conversation"]["messages"]>>;
    sent: boolean;
    setSent: (value: boolean) => void;
  }) {
    const channel = current.conversation.channel;

    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-ink">Conversation</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {channel} · {current.conversation.status === "booked" ? "Appointment booked" : current.conversation.status === "awaiting" ? "Awaiting reply" : "Replied"}
            </p>
          </div>
          <StatusBadge status={current.conversation.status} />
        </div>
        <div className="max-h-[360px] space-y-3 overflow-y-auto rounded-[6px] border border-line bg-white/[0.012] p-3 app-scroll">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <div
                  className={`rounded-[7px] px-2.5 py-2 text-[12px] leading-relaxed ${
                    message.direction === "outbound"
                      ? "bg-[#333338] text-[#ececf0]"
                      : "border border-line bg-surface-2 text-[#c7c7cd]"
                  }`}
                >
                  {message.body}
                </div>
                <p className={`mt-1 text-[9px] text-muted-foreground/70 ${message.direction === "outbound" ? "text-right" : ""}`}>
                  {formatDate(message.at, "d MMM · HH:mm")} · {message.channel}
                </p>
              </div>
            </div>
          ))}
          {sent ? (
            <div className="flex justify-end">
              <div className="max-w-[80%]">
                <div className="rounded-[7px] bg-[#333338] px-2.5 py-2 text-[12px] leading-relaxed text-[#ececf0]">{draft || "Message sent."}</div>
                <p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-[#83e0b3]">
                  <Check className="size-2.5" /> Delivered
                </p>
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-3 rounded-[6px] border border-line">
          <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
            {["Confirm appointment", "Offer two times", "Reschedule"].map((template) => (
              <button
                key={template}
                type="button"
                onClick={() =>
                  setDraft(
                    template === "Confirm appointment"
                      ? `Hi ${current.patient.firstName || "there"}, your recall appointment is confirmed. See you soon — Bright Dental Group.`
                      : template === "Offer two times"
                        ? `Hi ${current.patient.firstName || "there"}, we have Tuesday 9:30am or Thursday 2:30pm available. Which works best?`
                        : `Hi ${current.patient.firstName || "there"}, no problem — let me know a day that suits you and I'll find a time.`
                  )
                }
                className="rounded-[4px] px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-ink"
              >
                {template}
              </button>
            ))}
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Write a ${channel.toLowerCase()} message…`}
            rows={3}
            className="w-full resize-none bg-transparent px-3 py-2 text-[12px] leading-relaxed text-ink outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between border-t border-line px-2.5 py-1.5">
            <span className="text-[10px] text-muted-foreground">Drafts are not sent automatically.</span>
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => {
                setMessages((currentMessages) => [
                  ...currentMessages,
                  {
                    id: `local-${Date.now()}`,
                    direction: "outbound",
                    body: draft,
                    at: new Date(),
                    channel,
                  },
                ]);
                setSent(true);
                window.setTimeout(() => setSent(false), 1500);
                setDraft("");
              }}
              className="inline-flex h-6 items-center gap-1 rounded-[4px] bg-[#006ec3] px-2 text-[10px] font-medium text-white transition-colors hover:bg-[#0a7bd4] disabled:pointer-events-none disabled:opacity-40"
            >
              <Send className="size-3" /> Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  function TreatmentTab({ profile: current }: { profile: PatientProfile }) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[6px] border border-line p-3">
            <SectionTitle>Primary treatment</SectionTitle>
            <p className="mt-1.5 text-[15px] font-semibold text-ink">{current.patient.treatmentLabel}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Last completed type</p>
          </div>
          <div className="rounded-[6px] border border-line p-3">
            <SectionTitle>Estimated value</SectionTitle>
            <p className="mt-1.5 tabular text-[18px] font-semibold text-ink">{formatCurrency(current.patient.estimatedValue)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Planning estimate</p>
          </div>
          <div className="rounded-[6px] border border-line p-3">
            <SectionTitle>Outstanding</SectionTitle>
            <p className="mt-1.5 tabular text-[18px] font-semibold text-ink">{formatCurrency(current.outstanding)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Open opportunity</p>
          </div>
        </div>
        <div>
          <SectionTitle>Treatment history</SectionTitle>
          <AppointmentTable appointments={current.appointments} />
        </div>
        <div className="rounded-[6px] border border-line bg-white/[0.015] p-3">
          <div className="flex items-center gap-1.5">
            <Stethoscope className="size-3.5 text-muted-foreground" />
            <p className="text-[11px] font-medium text-[#dedee1]">What the AI sees</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {current.patient.name} last visited {relativeDay(current.patient.lastVisitAt)} for {current.patient.treatmentLabel.toLowerCase()}. Based on
            the {current.patient.recallIntervalMonths ?? 6}-month interval, the next recall is {relativeDay(current.patient.recallDue)}. Booking this
            recall would recover an estimated {formatCurrency(current.patient.estimatedValue)} in production.
          </p>
        </div>
      </div>
    );
  }

  function ActivityTab({ profile: current }: { profile: PatientProfile }) {
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>Activity timeline</SectionTitle>
          <p className="mt-1 text-[11px] text-muted-foreground">All recall, appointment and conversation events for this patient.</p>
        </div>
        <div className="divide-y divide-line/60">
          {current.timeline.map((item) => (
            <TimelineRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    );
  }
}

function TimelineRow({ item }: { item: PatientProfile["timeline"][number] }) {
  const tone =
    item.kind === "revenue"
      ? "text-[#5bd39a] bg-[#5bd39a]/10"
      : item.kind === "reply"
        ? "text-[#8ed8ff] bg-[#006ec3]/15"
        : item.kind === "message"
          ? "text-[#53d2e5] bg-[#53d2e5]/10"
          : item.kind === "appointment"
            ? "text-[#5bd39a] bg-[#5bd39a]/10"
            : "text-[#e3b341] bg-[#e3b341]/10";
  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[5px] ${tone}`}>
        {item.kind === "appointment" ? (
          <CalendarCheck2 className="size-3.5" />
        ) : item.kind === "reply" || item.kind === "message" ? (
          <MessageSquare className="size-3.5" />
        ) : item.kind === "revenue" ? (
          <Sparkles className="size-3.5" />
        ) : (
          <UserRound className="size-3.5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-[#dedee1]">{item.title}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.detail}</p>
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground/70">{timeAgo(item.occurredAt)}</span>
    </div>
  );
}

function AppointmentTable({ appointments, compact = false }: { appointments: PatientProfile["appointments"]; compact?: boolean }) {
  if (appointments.length === 0) {
    return <p className="py-4 text-[12px] text-muted-foreground">No appointments recorded.</p>;
  }
  return (
    <div className="overflow-x-auto app-scroll">
      <table className="w-full min-w-[540px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
            <th className="whitespace-nowrap py-2 pr-3 font-medium">Date</th>
            <th className="whitespace-nowrap px-2 py-2 font-medium">Treatment</th>
            {compact ? null : <th className="whitespace-nowrap px-2 py-2 font-medium">Provider</th>}
            <th className="whitespace-nowrap px-2 py-2 font-medium">Location</th>
            <th className="whitespace-nowrap px-2 py-2 font-medium">Value</th>
            <th className="whitespace-nowrap py-2 pl-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id} className="border-b border-line/60 last:border-0">
              <td className="py-2.5 pr-2 text-[12px] text-[#c7c7cd]">{formatDate(appointment.startsAt, "d MMM yyyy")}</td>
              <td className="truncate px-2 py-2.5 text-[12px] text-muted-foreground">{appointment.treatmentLabel}</td>
              {compact ? null : <td className="truncate px-2 py-2.5 text-[12px] text-muted-foreground">{appointment.providerName ?? "—"}</td>}
              <td className="truncate px-2 py-2.5 text-[12px] text-muted-foreground">{appointment.locationName ?? "—"}</td>
              <td className="tabular px-2 py-2.5 text-[12px] text-[#c7c7cd]">
                {appointment.productionValue ? formatCurrency(appointment.productionValue) : "—"}
              </td>
              <td className="whitespace-nowrap py-2.5 pl-2">
                <StatusBadge status={appointment.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
