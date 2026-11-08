import { and, eq, inArray, like, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  appointments,
  locations,
  patientChannelConsents,
  patients,
  providers,
} from "./schema";
import type { NormalizedPatientRow } from "@recallpilot/core";

export interface CommitRowsInput {
  orgId: string;
  importId: string | null;
  rows: NormalizedPatientRow[];
}

export async function commitNormalizedRows(input: CommitRowsInput): Promise<{ patientIds: Map<string, string> }> {
  const db = getDb();
  const patientIds = new Map<string, string>();

  await db.transaction(async (tx) => {
    const orgLocations = await tx
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(eq(locations.orgId, input.orgId));
    const orgProviders = await tx
      .select({ id: providers.id, name: providers.name })
      .from(providers)
      .where(eq(providers.orgId, input.orgId));
    const locationIds = new Map(orgLocations.map((location) => [location.name.toLowerCase(), location.id]));
    const providerIds = new Map(orgProviders.map((provider) => [provider.name.toLowerCase(), provider.id]));

    const missingLocations = [
      ...new Set(
        input.rows
          .map((row) => row.locationName?.trim())
          .filter((name): name is string => Boolean(name) && !locationIds.has(name!.toLowerCase()))
      ),
    ];
    if (missingLocations.length > 0) {
      const created = await tx
        .insert(locations)
        .values(
          missingLocations.map((name) => ({
            orgId: input.orgId,
            name,
            country: "DE",
            timezone: "Europe/Berlin",
          }))
        )
        .onConflictDoNothing()
        .returning({ id: locations.id, name: locations.name });
      for (const location of created) locationIds.set(location.name.toLowerCase(), location.id);
      const refreshed = await tx
        .select({ id: locations.id, name: locations.name })
        .from(locations)
        .where(eq(locations.orgId, input.orgId));
      for (const location of refreshed) locationIds.set(location.name.toLowerCase(), location.id);
    }

    const missingProviders = [
      ...new Set(
        input.rows
          .map((row) => row.providerName?.trim())
          .filter((name): name is string => Boolean(name) && !providerIds.has(name!.toLowerCase()))
      ),
    ];
    if (missingProviders.length > 0) {
      const created = await tx
        .insert(providers)
        .values(
          missingProviders.map((name) => ({
            orgId: input.orgId,
            name,
            locationId: null,
          }))
        )
        .onConflictDoNothing()
        .returning({ id: providers.id, name: providers.name });
      for (const provider of created) providerIds.set(provider.name.toLowerCase(), provider.id);
      const refreshed = await tx
        .select({ id: providers.id, name: providers.name })
        .from(providers)
        .where(eq(providers.orgId, input.orgId));
      for (const provider of refreshed) providerIds.set(provider.name.toLowerCase(), provider.id);
    }

    if (input.importId) {
      await tx.delete(appointments).where(eq(appointments.sourceImportId, input.importId));
    } else {
      await tx
        .delete(appointments)
        .where(and(eq(appointments.orgId, input.orgId), like(appointments.externalId, "seed:%")));
    }

    const chunkSize = 200;
    for (let start = 0; start < input.rows.length; start += chunkSize) {
      const chunk = input.rows.slice(start, start + chunkSize);
      const values = chunk.map((row) => ({
        orgId: input.orgId,
        locationId: row.locationName ? locationIds.get(row.locationName.toLowerCase()) ?? null : null,
        providerId: row.providerName ? providerIds.get(row.providerName.toLowerCase()) ?? null : null,
        externalId: row.externalId,
        patientKey: row.patientKey,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        birthDate: row.birthDate,
        lastVisitAt: row.lastVisitAt,
        nextRecallAt: row.nextRecallAt,
        recallIntervalMonths: row.recallIntervalMonths,
        lastTreatmentType: row.treatmentType,
        locale: row.locale,
        sourceImportId: input.importId,
      }));

      await tx
        .insert(patients)
        .values(values)
        .onConflictDoUpdate({
          target: [patients.orgId, patients.patientKey],
          set: {
            locationId: sql`excluded.location_id`,
            providerId: sql`excluded.provider_id`,
            externalId: sql`excluded.external_id`,
            firstName: sql`excluded.first_name`,
            lastName: sql`excluded.last_name`,
            email: sql`excluded.email`,
            phone: sql`excluded.phone`,
            birthDate: sql`excluded.birth_date`,
            lastVisitAt: sql`excluded.last_visit_at`,
            nextRecallAt: sql`excluded.next_recall_at`,
            recallIntervalMonths: sql`excluded.recall_interval_months`,
            lastTreatmentType: sql`excluded.last_treatment_type`,
            locale: sql`excluded.locale`,
            sourceImportId: sql`excluded.source_import_id`,
            updatedAt: new Date(),
          },
        });

      const keys = values.map((value) => value.patientKey);
      const inserted = await tx
        .select({ id: patients.id, patientKey: patients.patientKey })
        .from(patients)
        .where(and(eq(patients.orgId, input.orgId), inArray(patients.patientKey, keys)));
      for (const patient of inserted) patientIds.set(patient.patientKey, patient.id);
    }

    const consentValues: Array<typeof patientChannelConsents.$inferInsert> = [];
    const appointmentValues: Array<typeof appointments.$inferInsert> = [];
    const now = new Date();

    for (const row of input.rows) {
      const patientId = patientIds.get(row.patientKey);
      if (!patientId) continue;
      consentValues.push({
        orgId: input.orgId,
        patientId,
        channel: "email",
        granted: row.consentEmail,
        source: input.importId ? "csv_import" : "synthetic_seed",
        grantedAt: row.consentEmail ? now : null,
        revokedAt: row.consentEmail ? null : now,
        updatedAt: now,
      });
      consentValues.push({
        orgId: input.orgId,
        patientId,
        channel: "sms",
        granted: row.consentSms,
        source: input.importId ? "csv_import" : "synthetic_seed",
        grantedAt: row.consentSms ? now : null,
        revokedAt: row.consentSms ? null : now,
        updatedAt: now,
      });
      if (row.lastVisitAt) {
        appointmentValues.push({
          orgId: input.orgId,
          patientId,
          locationId: row.locationName ? locationIds.get(row.locationName.toLowerCase()) ?? null : null,
          providerId: row.providerName ? providerIds.get(row.providerName.toLowerCase()) ?? null : null,
          externalId: input.importId ? `import:${input.importId}:${row.rowNumber}` : `seed:${row.rowNumber}`,
          treatmentType: row.treatmentType,
          status: "completed",
          startsAt: new Date(`${row.lastVisitAt}T12:00:00Z`),
          productionValue: row.productionValue === null ? null : row.productionValue.toFixed(2),
          sourceImportId: input.importId,
        });
      }
    }

    for (let start = 0; start < consentValues.length; start += 300) {
      const chunk = consentValues.slice(start, start + 300);
      if (chunk.length === 0) continue;
      await tx
        .insert(patientChannelConsents)
        .values(chunk)
        .onConflictDoUpdate({
          target: [patientChannelConsents.patientId, patientChannelConsents.channel],
          set: {
            granted: sql`excluded.granted`,
            source: sql`excluded.source`,
            grantedAt: sql`excluded.granted_at`,
            revokedAt: sql`excluded.revoked_at`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    }

    for (let start = 0; start < appointmentValues.length; start += 300) {
      const chunk = appointmentValues.slice(start, start + 300);
      if (chunk.length > 0) await tx.insert(appointments).values(chunk).onConflictDoNothing();
    }
  });

  return { patientIds };
}
