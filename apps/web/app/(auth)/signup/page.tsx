import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@recallpilot/ui";
import { getCurrentUser } from "@/lib/auth";
import { SignUpForm } from "@/components/auth-forms";
import { SiteFooter, SiteHeader } from "@/components/site";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/app/overview");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="space-y-4">
            <p className="font-heading text-xs uppercase tracking-[0.18em] text-accent">Practice workspace</p>
            <h1 className="text-balance font-heading text-4xl font-medium">Start with a clean import.</h1>
            <p className="text-pretty text-muted-foreground">
              Create your practice, add locations and import patients. Validation runs before anything is committed, and
              the first audit link is shareable immediately.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>· Magic-link or password sign-in</li>
              <li>· Organization-level data isolation</li>
              <li>· Tokenized reports that expire and can be revoked</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </div>
          <Card className="bg-background">
            <CardHeader>
              <CardTitle>Create your workspace</CardTitle>
              <CardDescription>English UI in R1. Locale fields are stored for German and Dutch.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignUpForm />
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
