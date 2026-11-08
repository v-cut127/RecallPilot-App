import { ImportWizard } from "@/components/import-wizard";
import { requireOrgContext } from "@/lib/auth";

export const metadata = { title: "Import patients" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireOrgContext();
  return <ImportWizard />;
}
