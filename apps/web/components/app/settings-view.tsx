"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Database, Bell, ShieldCheck, Users } from "lucide-react";
import type { SettingsData } from "@/lib/app-data";
import { updateOrganizationAction, updateRecallRuleAction } from "@/app/app/actions";
import { Avatar, Panel, SectionLabel, StatusBadge } from "./ui";
import { Toggle } from "./client-ui";
import { formatDate } from "@/lib/format";

type Tab = "workspace" | "rules" | "notifications" | "team" | "data";

const TABS: Array<{ value: Tab; label: string; icon: React.ElementType }> = [
  { value: "workspace", label: "Workspace", icon: Building2 },
  { value: "rules", label: "Recall rules", icon: Check },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "team", label: "Team", icon: Users },
  { value: "data", label: "Data & privacy", icon: ShieldCheck },
];

const inputClass =
  "h-8 w-full rounded-[6px] border border-line bg-surface-2 px-2.5 text-[12px] text-ink outline-none transition-colors placeholder:text-muted-foreground focus:border-[#2a4a78]";

export function SettingsView({
  data,
  user,
  role,
  retention,
}: {
  data: SettingsData;
  user: { name: string; email: string };
  role: string;
  retention: { leadHours: number; orgHours: number; rowHours: number; linkDays: number };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("workspace");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[196px_minmax(0,1fr)]">
      <Panel className="h-fit p-1.5">
        <nav className="flex flex-col gap-0.5">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={`flex h-7 items-center gap-2 rounded-[5px] px-2 text-left text-[12px] font-medium transition-colors ${
                  active ? "bg-[#0c1a33] text-ink" : "text-[#93a0b8] hover:bg-white/[0.035] hover:text-[#dbe4f3]"
                }`}
              >
                <Icon className={`size-3.5 ${active ? "text-[#7fd8e7]" : "text-[#7e8ca6]"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-2 border-t border-line px-2 pb-1 pt-2">
          <p className="text-[9px] leading-relaxed text-muted-foreground/60">
            Signed in as
            <br />
            <span className="text-[#a9b6cc]">{user.email}</span>
          </p>
        </div>
      </Panel>

      <Panel>
        {tab === "workspace" ? (
          <div>
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[13px] font-semibold text-ink">Workspace</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Practice identity, locale and clinic locations.</p>
            </div>
            <form
              className="space-y-4 px-4 py-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                startTransition(async () => {
                  await updateOrganizationAction(formData);
                  setSaved(true);
                  router.refresh();
                  window.setTimeout(() => setSaved(false), 1800);
                });
              }}
            >
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[11px] font-medium text-[#a9b6cc]">Practice name</span>
                  <input name="name" defaultValue={data.organization.name} required maxLength={160} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium text-[#a9b6cc]">Workspace slug</span>
                  <input value={data.organization.slug} readOnly className={`${inputClass} cursor-not-allowed opacity-60`} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium text-[#a9b6cc]">Country</span>
                  <input value={data.organization.country} readOnly className={`${inputClass} cursor-not-allowed opacity-60`} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium text-[#a9b6cc]">Timezone</span>
                  <input name="timezone" defaultValue={data.organization.timezone} required className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium text-[#a9b6cc]">Locale</span>
                  <select name="locale" defaultValue={data.organization.locale} className={inputClass}>
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="nl">Nederlands</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-2 border-t border-line pt-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[#006ec3] px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#0a7bd4] disabled:pointer-events-none disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save changes"}
                </button>
                {saved ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#83e0b3]">
                    <Check className="size-3" /> Saved
                  </span>
                ) : null}
                <span className="ml-auto text-[10px] text-muted-foreground">{role} access</span>
              </div>
            </form>

            <div className="border-t border-line px-4 py-4">
              <SectionLabel>Locations</SectionLabel>
              <div className="mt-2 divide-y divide-line/60">
                {data.locations.map((location) => (
                  <div key={location.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-[12px] font-medium text-[#dbe4f3]">{location.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {location.city ?? "No city"} · {location.timezone}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{location.country ?? "DE"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "rules" ? (
          <div>
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[13px] font-semibold text-ink">Recall rules</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Intervals determine the recall due date for each treatment type.</p>
            </div>
            <div className="divide-y divide-line/60">
              {data.rules.map((rule) => (
                <form key={rule.id} action={updateRecallRuleAction} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[#dbe4f3]">{rule.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground capitalize">{rule.treatment} recall</p>
                  </div>
                  <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    Interval
                    <select name="intervalMonths" defaultValue={String(rule.intervalMonths)} className="h-6 rounded-[4px] border border-line bg-surface-2 px-1 text-[11px] text-ink outline-none">
                      {[3, 6, 9, 12, 18, 24].map((months) => (
                        <option key={months} value={months}>
                          {months} mo
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <input type="checkbox" name="active" value="true" defaultChecked={rule.active} className="size-3 accent-[#006ec3]" />
                    Active
                  </label>
                  <button
                    type="submit"
                    className="inline-flex h-6 items-center rounded-[4px] border border-line px-2 text-[10px] font-medium text-[#c2cde0] transition-colors hover:bg-white/[0.05] hover:text-ink"
                  >
                    Save
                  </button>
                </form>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                If a patient has no explicit interval, the rule for their last treatment type is used. Missing visit dates are excluded from the recall queue.
              </p>
            </div>
          </div>
        ) : null}

        {tab === "notifications" ? (
          <div>
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[13px] font-semibold text-ink">Notifications</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Choose what reaches the workspace inbox.</p>
            </div>
            <div className="divide-y divide-line/60 px-4">
              <div className="py-3">
                <Toggle label="Daily recall digest" description="A morning summary of new due and overdue patients." defaultChecked />
              </div>
              <div className="py-3">
                <Toggle label="Patient replies" description="Notify when a patient responds to a recall message." defaultChecked />
              </div>
              <div className="py-3">
                <Toggle label="Booking confirmations" description="Notify the workspace when a recall visit is booked." defaultChecked />
              </div>
              <div className="py-3">
                <Toggle label="Revenue milestones" description="Notify when attributed recovery reaches a monthly goal." />
              </div>
              <div className="py-3">
                <Toggle label="Weekly performance report" description="Email the recall funnel and recovered revenue each Monday." defaultChecked />
              </div>
            </div>
            <div className="border-t border-line px-4 py-3">
              <p className="text-[10px] text-muted-foreground">Notification preferences are stored per workspace.</p>
            </div>
          </div>
        ) : null}

        {tab === "team" ? (
          <div>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className="text-[13px] font-semibold text-ink">Team</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">People with access to this workspace.</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{data.members.length} member{data.members.length === 1 ? "" : "s"}</span>
            </div>
            <div className="divide-y divide-line/60">
              {data.members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={member.name} />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-[#dbe4f3]">{member.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={member.role === "owner" ? "active" : "scheduled"} label={member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Staff"} />
                    <span className="hidden text-[10px] text-muted-foreground sm:inline">Joined {formatDate(member.joinedAt, "d MMM yyyy")}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <p className="text-[10px] text-muted-foreground">Invitations are managed by the workspace owner. Roles control settings and billing access.</p>
            </div>
          </div>
        ) : null}

        {tab === "data" ? (
          <div>
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[13px] font-semibold text-ink">Data & privacy</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Retention, import history and workspace footprint.</p>
            </div>
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-3">
              {[
                { label: "Patient records", value: data.counts.patients.toLocaleString("en-US") },
                { label: "Appointments", value: data.counts.appointments.toLocaleString("en-US") },
                { label: "Imports", value: data.counts.imports.toLocaleString("en-US") },
              ].map((item) => (
                <div key={item.label} className="rounded-[6px] border border-line bg-white/[0.015] p-3">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">{item.label}</p>
                  <p className="mt-1.5 tabular text-[18px] font-semibold text-ink">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-4">
              <SectionLabel>Retention schedule</SectionLabel>
              <div className="mt-2 space-y-2 text-[11px]">
                <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-2">
                  <span className="text-muted-foreground">Raw lead uploads</span>
                  <span className="text-[#c5d2e8]">{retention.leadHours} hours</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-2">
                  <span className="text-muted-foreground">Workspace raw imports</span>
                  <span className="text-[#c5d2e8]">{retention.orgHours} hours</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-2">
                  <span className="text-muted-foreground">Import row previews</span>
                  <span className="text-[#c5d2e8]">{retention.rowHours} hours</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Shared audit links</span>
                  <span className="text-[#c5d2e8]">{retention.linkDays} days</span>
                </div>
              </div>
            </div>
            <div className="border-t border-line px-4 py-3">
              <div className="flex items-start gap-2 rounded-[6px] border border-line bg-white/[0.015] p-2.5">
                <Database className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Raw files are purged automatically. Validation errors remain downloadable until the import retention window ends. Audit share links can
                  be revoked at any time.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
