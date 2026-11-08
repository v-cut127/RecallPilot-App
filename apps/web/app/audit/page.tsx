import Link from "next/link";
import { FileCheck2, Lock, Mail, Timer } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@recallpilot/ui";
import { PublicAuditForm } from "@/components/public-audit-form";
import { SiteFooter, SiteHeader } from "@/components/site";

export const metadata = { title: "Free recall audit" };

const benefits = [
  {
    icon: Timer,
    title: "Under a minute for 5,000 rows",
    body: "Parsing, validation and the audit run in the worker. You see progress while it happens.",
  },
  {
    icon: FileCheck2,
    title: "No silent data loss",
    body: "Every rejected row is downloadable with a reason. Map columns manually when auto-detection misses.",
  },
  {
    icon: Lock,
    title: "Tokenized and revocable",
    body: "The report link is unguessable, expires in 30 days and can be revoked. Raw files are purged on schedule.",
  },
];

export default function AuditLandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container grid gap-10 py-12 lg:grid-cols-[1fr_0.9fr] lg:items-start lg:py-16">
          <div className="space-y-6">
            <Badge variant="accent">No account required</Badge>
            <h1 className="text-balance font-heading text-4xl font-medium sm:text-5xl">
              See what your recall list is worth.
            </h1>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Upload a CSV export. We detect the delimiter and encoding, suggest a mapping, validate every row and return
              a shareable audit with overdue cohorts and estimated production at risk.
            </p>
            <div className="space-y-3">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex gap-3 rounded-[10px] border border-border p-4">
                  <benefit.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="font-heading text-sm font-medium">{benefit.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{benefit.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Need mapping control and repeat imports?{" "}
              <Link href="/signup" className="text-accent hover:underline">
                Create a practice workspace
              </Link>
              .
            </p>
          </div>

          <Card className="bg-background">
            <CardHeader>
              <CardTitle>Run the free recall audit</CardTitle>
              <p className="text-sm text-muted-foreground">
                English report in R1. Your data stays in the EU when Supabase storage is enabled.
              </p>
            </CardHeader>
            <CardContent>
              <PublicAuditForm />
            </CardContent>
          </Card>
        </div>

        <section className="border-t border-border bg-card py-10">
          <div className="container flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent" />
              <span>The report is emailed to you and available at its share link.</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-accent" />
              <span>Clinical, insurance and complaint questions are outside this audit.</span>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
