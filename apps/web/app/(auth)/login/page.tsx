import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator } from "@recallpilot/ui";
import { getCurrentUser } from "@/lib/auth";
import { MagicLinkForm, SignInForm } from "@/components/auth-forms";
import { SiteFooter, SiteHeader } from "@/components/site";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ checkEmail?: string; magicError?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/app/overview");
  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-2 lg:items-start">
          <Card className="bg-background">
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Use your password or request a magic link.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {params.checkEmail ? (
                <Alert variant="success">
                  <AlertDescription>Check your email to confirm your account, then sign in.</AlertDescription>
                </Alert>
              ) : null}
              {params.magicError ? (
                <Alert variant="destructive">
                  <AlertDescription>That sign-in link is invalid or has expired. Request a new one.</AlertDescription>
                </Alert>
              ) : null}
              <SignInForm />
              <Separator />
              <div className="space-y-3">
                <p className="font-heading text-sm font-medium">Email me a sign-in link</p>
                <MagicLinkForm />
              </div>
            </CardContent>
          </Card>
          <div className="space-y-4 lg:pt-6">
            <p className="font-heading text-xs uppercase tracking-[0.18em] text-accent">New to RecallPilot?</p>
            <h1 className="text-balance font-heading text-3xl font-medium">Go from CSV to a shareable audit.</h1>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              Create a practice workspace, import patients and share the tokenized report. The report shows every
              assumption behind the estimate.
            </p>
            <Link href="/signup" className="inline-flex text-sm font-medium text-accent hover:underline">
              Create an account →
            </Link>
            <Link href="/audit" className="block text-sm text-muted-foreground hover:text-accent">
              Or run the free audit without an account →
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
