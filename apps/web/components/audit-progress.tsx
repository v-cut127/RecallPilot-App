"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, Progress } from "@recallpilot/ui";
import { Loader2 } from "lucide-react";

interface StatusPayload {
  status: "processing" | "completed" | "failed";
  stage: string | null;
  rowCount: number;
  validCount: number;
  errorCount: number;
  errorMessage?: string | null;
}

const steps = [
  { key: "uploaded", label: "Upload received" },
  { key: "parsing", label: "Parsing delimiter and dates" },
  { key: "validating", label: "Validating rows" },
  { key: "auditing", label: "Building the audit" },
  { key: "reporting", label: "Rendering the report" },
  { key: "completed", label: "Report ready" },
];

function currentIndex(stage: string | null): number {
  if (!stage) return 0;
  const index = steps.findIndex((step) => step.key === stage);
  return index >= 0 ? index : 1;
}

export function AuditProgress({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const response = await fetch(`/api/audits/${token}/status`, { cache: "no-store" });
        const data = (await response.json()) as StatusPayload & { error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error ?? "Could not read the audit status.");
          return;
        }
        setStatus(data);
        if (data.status === "completed" || data.status === "failed") {
          router.refresh();
          return;
        }
        timer = setTimeout(poll, 1500);
      } catch {
        if (!cancelled) timer = setTimeout(poll, 2500);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router, token]);

  if (status?.status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          The audit could not be completed. {status.errorMessage ?? "Check the CSV mapping and try again."}
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const activeIndex = status?.status === "completed" ? steps.length - 1 : currentIndex(status?.stage ?? null);
  const progress = Math.min(95, Math.round(((activeIndex + 1) / steps.length) * 100));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        Working on your audit. This page updates automatically.
      </div>
      <Progress value={progress} />
      <ol className="space-y-2">
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li
              key={step.key}
              className={
                done
                  ? "rounded-[7px] bg-success-soft px-3 py-2 text-sm text-ink"
                  : active
                    ? "rounded-[7px] bg-accent-soft px-3 py-2 text-sm font-medium text-ink"
                    : "rounded-[7px] px-3 py-2 text-sm text-muted-foreground"
              }
            >
              {done ? "✓ " : active ? "• " : ""}
              {step.label}
            </li>
          );
        })}
      </ol>
      {status ? (
        <p className="text-xs text-muted-foreground">
          {status.rowCount} rows detected · {status.validCount} valid · {status.errorCount} with errors
        </p>
      ) : null}
    </div>
  );
}
