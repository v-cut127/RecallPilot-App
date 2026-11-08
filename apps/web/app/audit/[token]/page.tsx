import Link from "next/link";
import { AlertTriangle, Clock, FileWarning } from "lucide-react";
import { Alert, AlertDescription, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@recallpilot/ui";
import { eq, getDb, audits, imports } from "@recallpilot/db";
import { isShareLinkActive } from "@recallpilot/core/share-token";
import { ReportView } from "@/components/report-view";
import { AuditProgress } from "@/components/audit-progress";
import { SiteFooter, SiteHeader } from "@/components/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit report" };

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex flex-1 items-center justify-center py-16">
        <Card className="w-full max-w-lg bg-background text-center">
          <CardContent className="space-y-4 p-8">
            <AlertTriangle className="mx-auto h-8 w-8 text-warning" />
            <h1 className="font-heading text-2xl font-medium">{title}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/audit">Run a new audit</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}

export default async function AuditReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const [audit] = await db.select().from(audits).where(eq(audits.token, token)).limit(1);

  if (!audit) {
    return (
      <Unavailable
        title="Report not found"
        body="This link is not valid. Ask the practice to share an active report link, or run a new free audit."
      />
    );
  }

  if (!isShareLinkActive({ expiresAt: audit.expiresAt, revokedAt: audit.revokedAt })) {
    return (
      <Unavailable
        title="This report link is no longer available"
        body="The link has expired or the practice revoked it. Reports expire after 30 days by default and can be revoked at any time."
      />
    );
  }

  const [importRecord] = audit.importId
    ? await db.select().from(imports).where(eq(imports.id, audit.importId)).limit(1)
    : [];

  if (audit.status === "processing") {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container max-w-3xl flex-1 py-12">
          <div className="mb-6 space-y-2">
            <Badge variant="accent">Free recall audit</Badge>
            <h1 className="font-heading text-3xl font-medium">Building your audit</h1>
            <p className="text-sm text-muted-foreground">
              The worker parses, maps, validates and audits the file, then purges the raw upload. Keep this page open or
              return to this link later.
            </p>
          </div>
          <Card className="bg-background">
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditProgress token={token} />
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (audit.status === "failed") {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container max-w-3xl flex-1 py-12">
          <Card className="bg-background">
            <CardHeader>
              <Badge variant="destructive" className="w-fit">
                Audit failed
              </Badge>
              <CardTitle>We could not build this audit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  {importRecord?.errorMessage ??
                    "The file could not be mapped or validated. Check that it contains a name and a last-visit or next-recall date column."}
                </AlertDescription>
              </Alert>
              <div className="flex flex-wrap gap-2">
                {importRecord && importRecord.errorCount > 0 ? (
                  <Button asChild variant="outline">
                    <a href={`/api/audits/${token}/errors`}>
                      <FileWarning className="h-4 w-4" /> Download validation errors
                    </a>
                  </Button>
                ) : null}
                <Button asChild>
                  <Link href="/audit">Try another file</Link>
                </Button>
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Raw uploads are purged on the retention schedule even when an audit
                fails.
              </p>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const summary = audit.summary;
  if (!summary) {
    return (
      <Unavailable
        title="Report is not ready"
        body="This report has no summary yet. Try refreshing the link, or run a new audit."
      />
    );
  }

  return (
    <ReportView
      token={token}
      summary={summary}
      practiceName={audit.practiceName}
      expiresAt={audit.expiresAt}
      errorsUrl={`/api/audits/${token}/errors`}
    />
  );
}
