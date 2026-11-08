"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { createAppointmentAction } from "@/app/app/actions";
import type { AppointmentFormPatient } from "@/lib/app-data";
import { Modal } from "./client-ui";

const inputClass =
  "h-8 w-full rounded-[6px] border border-line bg-surface-2 px-2.5 text-[12px] text-ink outline-none transition-colors placeholder:text-muted-foreground focus:border-[#2a4a78]";

function defaultStart(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 30, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function SubmitButton({ formId }: { formId: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      form={formId}
      disabled={pending}
      className="inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[#006ec3] px-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#0a7bd4] disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? "Scheduling…" : "Schedule appointment"}
    </button>
  );
}

export function NewAppointmentButton({
  patients,
  initialPatientId,
  autoOpen = false,
}: {
  patients: AppointmentFormPatient[];
  initialPatientId?: string;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [patientId, setPatientId] = useState(initialPatientId ?? patients[0]?.id ?? "");
  const [startsAt, setStartsAt] = useState("");
  const [treatment, setTreatment] = useState<AppointmentFormPatient["treatment"]>(
    patients.find((patient) => patient.id === initialPatientId)?.treatment ?? "hygiene"
  );

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      setStartsAt((value) => value || defaultStart());
    }
  }, [autoOpen]);

  const openDialog = () => {
    setStartsAt(defaultStart());
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#006ec3] px-2.5 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors hover:bg-[#0a7bd4]"
      >
        <Plus className="size-3.5" />
        New appointment
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New appointment"
        description="Book a recall visit. The appointment is written to the practice schedule immediately."
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-7 items-center rounded-[5px] border border-line px-2.5 text-[12px] font-medium text-[#c2cde0] transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              Cancel
            </button>
            <SubmitButton formId="new-appointment-form" />
          </>
        }
      >
        <form id="new-appointment-form" action={createAppointmentAction} className="space-y-3.5">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-[#a9b6cc]">Patient</span>
            <select
              name="patientId"
              value={patientId}
              onChange={(event) => {
                setPatientId(event.target.value);
                const patient = patients.find((item) => item.id === event.target.value);
                if (patient) setTreatment(patient.treatment);
              }}
              className={inputClass}
              required
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} · {patient.treatmentLabel}
                  {patient.recallDue ? ` · due ${patient.recallDue}` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-[#a9b6cc]">Date and time</span>
              <input
                name="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-[#a9b6cc]">Treatment</span>
              <select name="treatment" value={treatment} onChange={(event) => setTreatment(event.target.value as AppointmentFormPatient["treatment"])} className={inputClass}>
                <option value="hygiene">Hygiene</option>
                <option value="checkup">Check-up</option>
                <option value="treatment">Treatment</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            The appointment uses the patient&apos;s assigned location and provider. You can update the status from the schedule.
          </p>
        </form>
      </Modal>
    </>
  );
}
