import { requireOrgContext } from "@/lib/auth";
import { getConversations } from "@/lib/app-data";
import { ConversationsView } from "@/components/app/conversations-view";

export const metadata = { title: "Conversations" };
export const dynamic = "force-dynamic";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireOrgContext();
  const params = await searchParams;
  const patientId = Array.isArray(params.patient) ? params.patient[0] : params.patient;
  const threads = await getConversations(context.organization.id);
  return <ConversationsView threads={threads} initialPatientId={patientId} />;
}
