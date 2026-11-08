import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, FileSpreadsheet, MapPin } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@recallpilot/ui";
import { getCurrentUser, getOrgContext } from "@/lib/auth";
import { CreateOrgForm } from "@/components/create-org-form";
import { Brand } from "@/components/brand";

export const metadata = { title: "Onboarding" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const context = await getOrgContext();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Brand href="/" />
          <Link href="/app/overview" className="text-sm text-accent hover:underline">
            Go to workspace →
          </Link>
        </div>
      </header>
      <main className="container max-w-4xl py-12">
        <div className="mb-8 space-y-3">
          <Badge variant="accent">R1 onboarding</Badge>
          <h1 className="font-heading text-4xl font-medium">Set up the practice, then import patients.</h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            The import validates before committing. You will see duplicates, missing contacts, invalid dates and
            unmatched locations before any patient is written.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-background md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" /> Practice
              </CardTitle>
            </CardHeader>
            <CardContent>
              {context ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Organization</p>
                    <p className="font-heading text-xl font-medium">{context.organization.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Locations</p>
                    <ul className="mt-2 space-y-2">
                      {context.locations.map((location) => (
                        <li key={location.id} className="flex items-center gap-2 rounded-[10px] bg-card px-3 py-2 text-sm">
                          <MapPin className="h-4 w-4 text-accent" />
                          {location.name}
                          {location.city ? <span className="text-muted-foreground">· {location.city}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button asChild>
                    <Link href="/app/import">
                      Import patients <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <CreateOrgForm />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-accent" /> What happens next
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Upload a CSV export from your practice system.</p>
              <p>2. Confirm the suggested column mapping.</p>
              <p>3. Review validation errors and download the error CSV.</p>
              <p>4. Commit valid rows and open the shareable audit.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
