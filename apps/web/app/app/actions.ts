"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AUDIT_DEFAULTS } from "@recallpilot/core";
import { and, eq, getDb, getPool, appointments, auditLogs, audits, patients, profiles, recallRules, organizations } from "@recallpilot/db";
import { requireOrgContext, requireUser } from "@/lib/auth";

export async function revokeAuditAction(formData: FormData): Promise<void> {
  const context = await requireOrgContext();
  const auditId = String(formData.get("auditId") ?? "");
  if (!auditId) return;

  const db = getDb();
  const updated = await db
    .update(audits)
    .set({ revokedAt: new Date() })
    .where(and(eq(audits.id, auditId), eq(audits.orgId, context.organization.id)))
    .returning({ id: audits.id });

  if (updated[0]) {
    await db.insert(auditLogs).values({
      orgId: context.organization.id,
      actorUserId: context.user.id,
      action: "audit.revoked",
      entityType: "audit",
      entityId: auditId,
    });
  }
  revalidatePath("/app/overview");
  revalidatePath("/app/revenue");
  revalidatePath("/app/dashboard");
}

const campaignSchema = z.object({
  name: z.string().trim().min(2, "Give the campaign a name.").max(120),
  treatment: z.enum(["hygiene", "checkup", "treatment", "other"]),
  intervalMonths: z.coerce.number().int().min(1).max(60),
});

export async function createCampaignAction(formData: FormData): Promise<void> {
  const context = await requireOrgContext();
  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    treatment: formData.get("treatment"),
    intervalMonths: formData.get("intervalMonths"),
  });
  if (!parsed.success) return;

  const db = getDb();
  const [created] = await db
    .insert(recallRules)
    .values({
      orgId: context.organization.id,
      name: parsed.data.name,
      treatmentType: parsed.data.treatment,
      intervalMonths: parsed.data.intervalMonths,
      active: true,
    })
    .returning({ id: recallRules.id });

  if (created) {
    await db.insert(auditLogs).values({
      orgId: context.organization.id,
      actorUserId: context.user.id,
      action: "campaign.created",
      entityType: "recall_rule",
      entityId: created.id,
      metadata: { name: parsed.data.name, treatment: parsed.data.treatment },
    });
    revalidatePath("/app/campaigns");
    revalidatePath("/app/overview");
    redirect(`/app/campaigns/${created.id}`);
  }
}

export async function toggleCampaignAction(formData: FormData): Promise<void> {
  const context = await requireOrgContext();
  const campaignId = String(formData.get("campaignId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!campaignId) return;
  const db = getDb();
  await db
    .update(recallRules)
    .set({ active })
    .where(and(eq(recallRules.id, campaignId), eq(recallRules.orgId, context.organization.id)));
  await db.insert(auditLogs).values({
    orgId: context.organization.id,
    actorUserId: context.user.id,
    action: active ? "campaign.activated" : "campaign.paused",
    entityType: "recall_rule",
    entityId: campaignId,
  });
  revalidatePath("/app/campaigns");
  revalidatePath(`/app/campaigns/${campaignId}`);
}

const organizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  city: z.string().trim().max(120).optional(),
  timezone: z.string().trim().min(1).max(80),
  locale: z.enum(["en", "de", "nl"]),
});

export async function updateOrganizationAction(formData: FormData): Promise<void> {
  const context = await requireOrgContext();
  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    city: formData.get("city") || undefined,
    timezone: formData.get("timezone"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) return;
  const db = getDb();
  await db
    .update(organizations)
    .set({
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      locale: parsed.data.locale,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, context.organization.id));
  await db.insert(auditLogs).values({
    orgId: context.organization.id,
    actorUserId: context.user.id,
    action: "workspace.updated",
    entityType: "organization",
    entityId: context.organization.id,
    metadata: { name: parsed.data.name },
  });
  revalidatePath("/app/settings");
  revalidatePath("/app/overview");
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
});

export async function updateProfileAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName") });
  if (!parsed.success) return;
  const db = getDb();
  await db.update(profiles).set({ fullName: parsed.data.fullName }).where(eq(profiles.id, user.id));
  await getPool().query("update auth.users set raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{full_name}', $1::jsonb, true) where id = $2", [
    JSON.stringify(parsed.data.fullName),
    user.id,
  ]);
  revalidatePath("/app/profile");
  revalidatePath("/app/overview");
}

const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  startsAt: z.string().min(1),
  treatment: z.enum(["hygiene", "checkup", "treatment", "other"]),
});

export async function createAppointmentAction(formData: FormData): Promise<void> {
  const context = await requireOrgContext();
  const parsed = appointmentSchema.safeParse({
    patientId: formData.get("patientId"),
    startsAt: formData.get("startsAt"),
    treatment: formData.get("treatment"),
  });
  if (!parsed.success) return;
  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) return;
  const db = getDb();
  const [patient] = await db
    .select({ id: patients.id, locationId: patients.locationId, providerId: patients.providerId })
    .from(patients)
    .where(and(eq(patients.id, parsed.data.patientId), eq(patients.orgId, context.organization.id)))
    .limit(1);
  if (!patient) return;
  await db.insert(appointments).values({
    orgId: context.organization.id,
    patientId: patient.id,
    locationId: patient.locationId,
    providerId: patient.providerId,
    treatmentType: parsed.data.treatment,
    status: "scheduled",
    startsAt,
  });
  await db.insert(auditLogs).values({
    orgId: context.organization.id,
    actorUserId: context.user.id,
    action: "appointment.created",
    entityType: "appointment",
    entityId: patient.id,
    metadata: { startsAt: startsAt.toISOString(), treatment: parsed.data.treatment },
  });
  revalidatePath("/app/appointments");
  revalidatePath(`/app/patients/${patient.id}`);
  redirect("/app/appointments?tab=upcoming&created=1");
}

export async function updateAppointmentStatusAction(formData: FormData): Promise<void> {
  const context = await requireOrgContext();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!appointmentId) return;
  if (!["scheduled", "completed", "cancelled", "no_show"].includes(status)) return;
  const db = getDb();
  const [appointment] = await db
    .select({ treatmentType: appointments.treatmentType, productionValue: appointments.productionValue })
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.orgId, context.organization.id)))
    .limit(1);
  if (!appointment) return;
  await db
    .update(appointments)
    .set({
      status: status as "scheduled" | "completed" | "cancelled" | "no_show",
      productionValue:
        status === "completed" && !appointment.productionValue
          ? String(AUDIT_DEFAULTS.averageProduction[appointment.treatmentType])
          : appointment.productionValue,
    })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.orgId, context.organization.id)));
  await db.insert(auditLogs).values({
    orgId: context.organization.id,
    actorUserId: context.user.id,
    action: `appointment.${status}`,
    entityType: "appointment",
    entityId: appointmentId,
  });
  revalidatePath("/app/appointments");
  revalidatePath("/app/patients");
}

export async function updateRecallRuleAction(formData: FormData): Promise<void> {
  const context = await requireOrgContext();
  const ruleId = String(formData.get("ruleId") ?? "");
  const interval = Number(formData.get("intervalMonths") ?? 0);
  const active = String(formData.get("active") ?? "") === "true";
  if (!ruleId || !Number.isFinite(interval) || interval < 1 || interval > 60) return;
  const db = getDb();
  await db
    .update(recallRules)
    .set({ intervalMonths: interval, active })
    .where(and(eq(recallRules.id, ruleId), eq(recallRules.orgId, context.organization.id)));
  revalidatePath("/app/settings");
  revalidatePath("/app/campaigns");
}
