import Link from "next/link";
import { ArrowRight, CheckCircle2, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@recallpilot/ui";
import { SiteFooter, SiteHeader } from "../components/site";

const steps = [
  {
    icon: FileSpreadsheet,
    title: "Upload your patient CSV",
    body: "Comma or semicolon, ISO or European dates. We detect the format and suggest the columns.",
  },
  {
    icon: CheckCircle2,
    title: "Validate before importing",
    body: "Duplicates, missing contacts and invalid dates are visible and downloadable. Nothing is silent.",
  },
  {
    icon: ShieldCheck,
    title: "See the estimate, with assumptions",
    body: "Overdue by treatment type, lapsed 12–24 months, due next 30 days and estimated production at risk.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="space-y-6">
            <Badge variant="accent" className="px-3 py-1">
              Free recall revenue audit
            </Badge>
            <h1 className="max-w-2xl text-balance font-heading text-5xl font-medium leading-[1.02] sm:text-6xl">
              Find the production hiding in your recall list.
            </h1>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Import your own patient export and see overdue patients, lapsed recalls and estimated production at risk.
              Every number is labelled as an estimate, with the assumptions shown.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/audit">
                  Run the free audit <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/signup">Create a practice workspace</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              No PMS write-back, no outreach and no clinical advice in R1. Email-gated, tokenized and revocable reports.
            </p>
          </div>

          <Card className="overflow-hidden bg-ink text-white">
            <CardContent className="space-y-5 p-8">
              <div className="flex items-center justify-between">
                <p className="font-heading text-sm text-white/70">Free audit preview</p>
                <Badge className="bg-white/10 text-white">Estimate</Badge>
              </div>
              <div>
                <p className="text-sm text-white/60">Estimated production at risk</p>
                <p className="font-heading text-5xl font-medium">€18,420</p>
                <p className="mt-1 text-sm text-white/60">Based on 3 assumptions shown in the report</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-[10px] bg-white/5 p-3">
                  <p className="text-white/60">Overdue</p>
                  <p className="font-heading text-xl">184</p>
                </div>
                <div className="rounded-[10px] bg-white/5 p-3">
                  <p className="text-white/60">Lapsed 12–24m</p>
                  <p className="font-heading text-xl">61</p>
                </div>
                <div className="rounded-[10px] bg-white/5 p-3">
                  <p className="text-white/60">Due in 30d</p>
                  <p className="font-heading text-xl">37</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-white/50">
                Illustrative only. Production is estimated from average visit values, not billing records. The audit
                does not model response or booking rates.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="border-y border-border bg-card py-16">
          <div className="container grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step.title} className="bg-background">
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center gap-3">
                    <step.icon className="h-5 w-5 text-accent" />
                    <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                      Step {index + 1}
                    </span>
                  </div>
                  <h2 className="font-heading text-xl font-medium">{step.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container py-16">
          <div className="grid gap-6 rounded-[10px] border border-border p-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="space-y-3">
              <h2 className="font-heading text-3xl font-medium">Built for practices in Germany and the Netherlands.</h2>
              <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
                The R1 interface and report are English-first. The data model stores patient and practice locale, and
                the import engine already understands German and Dutch column names and European date formats. German
                and Dutch UI translations are prepared for the next release.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-[10px] bg-card p-5 text-sm text-muted-foreground">
              <p className="font-heading text-xs uppercase tracking-widest text-ink">R1 boundaries</p>
              <p>No outreach, inbox, booking, billing, WhatsApp, voice or PMS integrations.</p>
              <p>Raw lead uploads are purged on the retention schedule. Share links expire and can be revoked.</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
