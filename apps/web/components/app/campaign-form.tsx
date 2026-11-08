"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { createCampaignAction } from "@/app/app/actions";
import { Modal } from "./client-ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[#006ec3] px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#0a7bd4] disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create campaign"}
    </button>
  );
}

const inputClass =
  "h-8 w-full rounded-[6px] border border-line bg-surface-2 px-2.5 text-[12px] text-ink outline-none transition-colors placeholder:text-muted-foreground focus:border-[#006ec3]/60";

export function NewCampaignButton({
  variant = "primary",
  label = "New campaign",
}: {
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "primary"
            ? "inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#006ec3] px-2.5 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors hover:bg-[#0a7bd4]"
            : "inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line bg-white/[0.02] px-2.5 text-[12px] font-medium text-[#c4c4ca] transition-colors hover:bg-white/[0.05] hover:text-ink"
        }
      >
        <Plus className="size-3.5" />
        {label}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New recall campaign"
        description="Create a recall rule. Patients matching the treatment type and recall window become the target audience."
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-7 items-center rounded-[5px] border border-line px-2.5 text-[12px] font-medium text-[#c4c4ca] transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              Cancel
            </button>
            <CreateSubmit formId="new-campaign-form" />
          </>
        }
      >
        <form id="new-campaign-form" action={createCampaignAction} className="space-y-3.5">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-[#ababb2]">Campaign name</span>
            <input name="name" required minLength={2} maxLength={120} placeholder="Spring hygiene recall" className={inputClass} />
          </label>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-[#ababb2]">Audience</span>
              <select name="treatment" defaultValue="hygiene" className={inputClass}>
                <option value="hygiene">Hygiene patients</option>
                <option value="checkup">Check-up patients</option>
                <option value="treatment">Treatment follow-ups</option>
                <option value="other">Other patients</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-[#ababb2]">Recall interval</span>
              <select name="intervalMonths" defaultValue="6" className={inputClass}>
                <option value="3">Every 3 months</option>
                <option value="6">Every 6 months</option>
                <option value="9">Every 9 months</option>
                <option value="12">Every 12 months</option>
                <option value="18">Every 18 months</option>
                <option value="24">Every 24 months</option>
              </select>
            </label>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Campaigns use the existing patient consent and channel settings. You can adjust the sequence after creating it.
          </p>
        </form>
      </Modal>
    </>
  );
}

function CreateSubmit({ formId }: { formId: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      form={formId}
      disabled={pending}
      className="inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[#006ec3] px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#0a7bd4] disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create campaign"}
    </button>
  );
}

export { SubmitButton, inputClass };
