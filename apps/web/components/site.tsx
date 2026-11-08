import Link from "next/link";
import { Button } from "@recallpilot/ui";
import { Brand } from "./brand";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="container flex h-16 items-center justify-between">
        <Brand />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/audit">Free audit</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Create account</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container flex flex-col items-start justify-between gap-2 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <p>RecallPilot · Recall and revenue recovery for dental practices.</p>
        <p>
          Estimates are planning assumptions, not guaranteed revenue.{" "}
          <Link href="/audit" className="text-accent hover:underline">
            Run a free audit
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
