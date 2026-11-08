import Link from "next/link";
import { LogOut } from "lucide-react";
import { Badge, Button } from "@recallpilot/ui";
import type { OrgContext } from "@/lib/auth";
import { signOutAction } from "@/lib/auth-actions";
import { Brand } from "./brand";
import { AppNav } from "./app-nav";

export function AppShell({ context, children }: { context: OrgContext; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Brand href="/app/dashboard" />
            <Badge variant="outline" className="hidden sm:inline-flex">
              {context.organization.name}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground md:inline">{context.user.email}</span>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="container grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6">
          <AppNav />
          <div className="hidden rounded-[10px] border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground lg:block">
            <p className="font-heading text-xs font-medium uppercase tracking-widest text-ink">R1 workspace</p>
            <p className="mt-2">Import, validate and audit. Outreach, inbox, booking and PMS write-back are not enabled.</p>
            <Link href="/audit" className="mt-3 inline-flex text-accent hover:underline">
              Run a public audit →
            </Link>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
