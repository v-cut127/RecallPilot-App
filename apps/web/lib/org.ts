import "server-only";
import { randomBytes } from "node:crypto";
import { getDb, getPool, locations, memberships, organizations, recallRules } from "@recallpilot/db";
import { slugify } from "./slug";

export async function createOrganizationForUser(input: {
  userId: string;
  practiceName: string;
  fullName?: string | null;
}): Promise<{ orgId: string; slug: string }> {
  const db = getDb();
  const practiceName = input.practiceName.trim();
  const slug = slugify(practiceName);

  const orgId = await db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name: practiceName,
        slug,
        createdBy: input.userId,
      })
      .returning({ id: organizations.id });
    if (!organization) throw new Error("Could not create the organization.");

    await tx.insert(memberships).values({
      orgId: organization.id,
      userId: input.userId,
      role: "owner",
    });

    await tx.insert(locations).values({
      orgId: organization.id,
      name: "Main location",
      city: null,
      country: "DE",
      timezone: "Europe/Berlin",
    });

    await tx.insert(recallRules).values([
      { orgId: organization.id, name: "Hygiene recall", treatmentType: "hygiene", intervalMonths: 6 },
      { orgId: organization.id, name: "Check-up recall", treatmentType: "checkup", intervalMonths: 12 },
      { orgId: organization.id, name: "Treatment follow-up", treatmentType: "treatment", intervalMonths: 12 },
    ]);

    return organization.id;
  });

  if (input.fullName) {
    await getPool().query("update public.profiles set full_name = $1 where id = $2", [
      input.fullName,
      input.userId,
    ]);
  }

  return { orgId, slug };
}

export function generateLocalToken(): string {
  return randomBytes(32).toString("base64url");
}
