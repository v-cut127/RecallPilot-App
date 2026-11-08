import Link from "next/link";
import { Download, FileWarning, Mail, Share2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@recallpilot/ui";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  type AuditSummary,
} from "@recallpilot/core";
import { Brand } from "./brand";
import { CopyLinkButton } from "./copy-link";

export function ReportView({
  token,
  summary,
  practiceName,
  expiresAt,
  errorsUrl,
  showWorkspaceCta = true,
}: {
  token: string;
  summary: AuditSummary;
  practiceName: string | null;
  expiresAt: Date;
  errorsUrl: string;
  showWorkspaceCta?: boolean;
}) {
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/audit/${token}`;
  const pdfUrl = `/api/audits/${token}/pdf`;
  const visibleLocations = summary.byLocation.filter((location) => location.totalPatients > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border print:hidden">
        <div className="container flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Brand href="/" />
            <Badge variant="outline" className="hidden sm:inline-flex">
              Recall revenue audit
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <CopyLinkButton url={shareUrl} />
            <Button asChild size="sm">
              <a href={pdfUrl}>
                <Download className="h-4 w-4" /> PDF
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl space-y-8 py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Prepared for {practiceName || summary.practiceName || "your practice"} · Audit date{" "}
              {formatDate(summary.asOfDate)}
            </p>
            <h1 className="font-heading text-4xl font-medium">Recall revenue audit</h1>
            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
              Overdue cohorts, lapsed recalls and estimated production at risk. Every production figure is an estimate
              based on the assumptions shown below.
            </p>
          </div>
          <div className="text-left text-xs text-muted-foreground sm:text-right">
            <p>Link expires {formatDateTime(expiresAt)}</p>
            <p>Tokenized · revocable</p>
          </div>
        </div>

        <div className="rounded-[10px] border border-warning/25 bg-warning-soft p-4 text-sm text-ink">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Estimate</Badge>
            <strong>This report is a planning estimate, not guaranteed revenue.</strong>
          </div>
          <p className="mt-2 text-muted-foreground">{summary.disclaimer}</p>
        </div>

        {summary.dataQuality.confidence === "directional" ? (
          <div className="rounded-[10px] border border-border bg-card p-4 text-sm text-muted-foreground">
            <strong className="text-ink">Directional sample.</strong> This audit has fewer than 50 valid patients. Treat
            the estimates as directional until a larger export is imported.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="bg-background">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <p className="font-heading text-sm uppercase tracking-[0.16em] text-muted-foreground">
                  Estimated production at risk
                </p>
                <Badge variant="warning">Assumption-based</Badge>
              </div>
              <p className="font-heading text-6xl font-medium leading-none text-ink">
                {formatCurrency(summary.production.total)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatNumber(summary.counts.overduePatients + summary.counts.dueNext30)} visits · average visit values
                listed below
              </p>
              <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                  <p className="font-heading text-2xl">{formatNumber(summary.counts.overduePatients)}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(summary.production.overdue)} est.</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lapsed 12–24m</p>
                  <p className="font-heading text-2xl">{formatNumber(summary.counts.lapsedPatients)}</p>
                  <p className="text-xs text-muted-foreground">included in overdue</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due next 30d</p>
                  <p className="font-heading text-2xl">{formatNumber(summary.counts.dueNext30)}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(summary.production.dueNext30)} est.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data quality</CardTitle>
              <CardDescription>What the audit could and could not use.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Rows imported</span>
                <span className="font-medium">{formatNumber(summary.dataQuality.rowsImported)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Valid rows</span>
                <span className="font-medium">{formatNumber(summary.dataQuality.rowsValid)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Rows with errors</span>
                <span className="font-medium">{formatNumber(summary.dataQuality.rowsWithErrors)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Rows with warnings</span>
                <span className="font-medium">{formatNumber(summary.dataQuality.rowsWithWarnings)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Missing contact</span>
                <span className="font-medium">{formatNumber(summary.counts.missingContact)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">No email consent</span>
                <span className="font-medium">{formatNumber(summary.counts.missingEmailConsent)}</span>
              </div>
              {summary.dataQuality.rowsWithErrors > 0 ? (
                <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                  <a href={errorsUrl}>
                    <FileWarning className="h-4 w-4" /> Download validation errors
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-background">
          <CardHeader>
            <CardTitle>Overdue by treatment type</CardTitle>
            <CardDescription>
              Lapsed patients are a subset of overdue. Production is not added twice.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treatment</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead>Lapsed 12–24m</TableHead>
                  <TableHead>Due next 30d</TableHead>
                  <TableHead>Avg. value assumption</TableHead>
                  <TableHead className="text-right">Estimated production</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.byTreatment.map((row) => (
                  <TableRow key={row.treatmentType}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>{formatNumber(row.overduePatients)}</TableCell>
                    <TableCell>{formatNumber(row.lapsedPatients)}</TableCell>
                    <TableCell>{formatNumber(row.dueNext30)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(row.averageProductionAssumption)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.estimatedProductionAtRisk)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {visibleLocations.length > 1 ? (
          <Card className="bg-background">
            <CardHeader>
              <CardTitle>By location</CardTitle>
              <CardDescription>How the overdue cohort is distributed across the practice.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Patients</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead>Due next 30d</TableHead>
                    <TableHead className="text-right">Estimated production</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleLocations.map((location) => (
                    <TableRow key={location.locationName}>
                      <TableCell className="font-medium">{location.locationName}</TableCell>
                      <TableCell>{formatNumber(location.totalPatients)}</TableCell>
                      <TableCell>{formatNumber(location.overduePatients)}</TableCell>
                      <TableCell>{formatNumber(location.dueNext30)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(location.estimatedProductionAtRisk)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        <Card className="bg-background">
          <CardHeader>
            <CardTitle>Assumptions behind every estimate</CardTitle>
            <CardDescription>
              These values are planning assumptions. Change the inputs before using the numbers in a business case.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.assumptions.map((assumption) => (
              <div key={assumption.key} className="rounded-[10px] border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="warning">Assumption</Badge>
                  <p className="font-heading text-sm font-medium">{assumption.label}</p>
                  <span className="text-sm text-muted-foreground">{assumption.value}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{assumption.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-background">
          <CardHeader>
            <CardTitle>Sample recall messages</CardTitle>
            <CardDescription>
              English templates only. No message was sent in R1. Clinical questions always go to the practice team.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {summary.sampleMessages.map((message) => (
              <div key={message.treatmentType} className="rounded-[10px] bg-card p-4">
                <p className="font-heading text-xs uppercase tracking-widest text-muted-foreground">{message.label}</p>
                <p className="mt-2 text-sm font-medium">{message.subject}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{message.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="rounded-[10px] border border-border p-6 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <Mail className="h-4 w-4 text-accent" />
            <span>A copy of this report was emailed to the address used to request the audit.</span>
          </div>
          <p className="mt-2">
            Link expires {formatDateTime(expiresAt)}. The practice can revoke it from the workspace dashboard. Raw
            uploads are purged on the retention schedule; validation errors remain downloadable until the retention
            window ends.
          </p>
        </div>

        {showWorkspaceCta ? (
          <div className="rounded-[10px] bg-ink p-6 text-white print:hidden">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-heading text-xl font-medium">Turn this audit into a repeatable recall workflow.</p>
                <p className="mt-1 text-sm text-white/60">
                  R1 ends at the audit. Outreach, inbox and booking are not enabled yet.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button asChild variant="secondary">
                  <Link href="/signup">Create a workspace</Link>
                </Button>
                <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                  <Link href="/audit">
                    <Share2 className="h-4 w-4" /> Run another audit
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
