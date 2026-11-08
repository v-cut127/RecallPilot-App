import { getIntegrationState } from "@/lib/app-data";
import { IntegrationsView } from "@/components/app/integrations-view";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  return <IntegrationsView config={getIntegrationState()} />;
}
