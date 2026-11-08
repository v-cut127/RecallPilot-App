import { notFound } from "next/navigation";
import { requireOrgContext } from "@/lib/auth";
import { getPatientProfile } from "@/lib/app-data";
import { PatientProfileView } from "@/components/app/patient-profile";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireOrgContext();
  const { id } = await params;
  const profile = await getPatientProfile(context.organization.id, id);
  if (!profile) notFound();
  return <PatientProfileView profile={profile} />;
}
