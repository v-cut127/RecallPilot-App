"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, Mail, ShieldCheck } from "lucide-react";
import { updateProfileAction } from "@/app/app/actions";
import { signOutAction } from "@/lib/auth-actions";
import { formatDate } from "@/lib/format";
import { Avatar, Panel, PanelHeader, StatusBadge } from "./ui";
import { Toggle } from "./client-ui";

export function ProfileView({
  user,
  organization,
  role,
  joinedAt,
}: {
  user: { name: string; email: string };
  organization: { name: string; slug: string };
  role: string;
  joinedAt: Date;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} size="lg" className="size-12 text-[15px]" />
        <div>
          <h1 className="text-[21px] font-semibold tracking-[-0.02em] text-ink">{user.name}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Mail className="size-3" /> {user.email}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status="active" label={role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Staff"} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Personal information" description="Your profile is visible to workspace members." />
            <form
              className="space-y-3.5 px-4 py-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                startTransition(async () => {
                  await updateProfileAction(formData);
                  setSaved(true);
                  router.refresh();
                  window.setTimeout(() => setSaved(false), 1800);
                });
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-[#ababb2]">Full name</span>
                <input
                  name="fullName"
                  defaultValue={user.name}
                  minLength={2}
                  maxLength={120}
                  className="h-8 w-full rounded-[6px] border border-line bg-surface-2 px-2.5 text-[12px] text-ink outline-none transition-colors focus:border-[#006ec3]/60"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-[#ababb2]">Email</span>
                <input
                  value={user.email}
                  readOnly
                  className="h-8 w-full cursor-not-allowed rounded-[6px] border border-line bg-surface-2 px-2.5 text-[12px] text-ink opacity-60 outline-none"
                />
              </label>
              <div className="flex items-center gap-2 border-t border-line pt-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[#006ec3] px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#0a7bd4] disabled:pointer-events-none disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save profile"}
                </button>
                {saved ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#83e0b3]">
                    <Check className="size-3" /> Saved
                  </span>
                ) : null}
              </div>
            </form>
          </Panel>

          <Panel>
            <PanelHeader title="Preferences" description="Personal defaults for this workspace." />
            <div className="divide-y divide-line/60 px-4">
              <div className="py-3">
                <Toggle label="Weekly recall summary" description="Receive a Monday digest by email." defaultChecked />
              </div>
              <div className="py-3">
                <Toggle label="Reply notifications" description="Show a notification when a patient replies." defaultChecked />
              </div>
              <div className="py-3">
                <Toggle label="Product updates" description="Occasional notes about new RecallPilot features." />
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Workspace membership" />
            <div className="space-y-2.5 px-4 py-3">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground">Workspace</span>
                <span className="truncate text-right text-[#c7c7cd]">{organization.name}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground">Role</span>
                <span className="capitalize text-[#c7c7cd]">{role}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground">Workspace slug</span>
                <span className="text-[#c7c7cd]">{organization.slug}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground">Member since</span>
                <span className="text-[#c7c7cd]">{formatDate(joinedAt, "d MMM yyyy")}</span>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Security" />
            <div className="space-y-2.5 px-4 py-3">
              <div className="flex items-start gap-2 rounded-[6px] border border-line bg-white/[0.015] p-2.5">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#83e0b3]" />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Session is protected by an HTTP-only cookie. Workspace data is scoped to your organization membership.
                </p>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[#f2777a]/25 px-2.5 text-[11px] font-medium text-[#f6a3a5] transition-colors hover:bg-[#f2777a]/10"
                >
                  <LogOut className="size-3" /> Sign out of RecallPilot
                </button>
              </form>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
