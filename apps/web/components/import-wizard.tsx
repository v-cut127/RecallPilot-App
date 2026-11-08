"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@recallpilot/ui";
import { CANONICAL_FIELD_DEFINITIONS } from "@recallpilot/core/mapping";
import type { CanonicalField, ImportMapping, NormalizedPatientRow, RowIssue } from "@recallpilot/core";
import { Upload } from "lucide-react";
import { CopyLinkButton } from "./copy-link";
import { PageHeader } from "./app/ui";

interface Detection {
  encoding: string;
  hasBom: boolean;
  delimiter: string;
  headers: string[];
  rowCount: number;
  sampleRows: string[][];
}

interface ImportState {
  id: string;
  filename: string;
  status: "uploaded" | "validating" | "ready" | "committing" | "completed" | "failed";
  stage: string | null;
  delimiter: string | null;
  encoding: string | null;
  headers: string[];
  mapping: ImportMapping;
  rowCount: number;
  validCount: number;
  errorCount: number;
  errorMessage: string | null;
  errors: Array<{ rowNumber: number; issues: RowIssue[]; normalized: NormalizedPatientRow | null }>;
  preview: Array<{ rowNumber: number; normalized: NormalizedPatientRow | null }>;
  auditToken: string | null;
}

const NONE = "__none__";

function statusStep(status: ImportState["status"]): number {
  switch (status) {
    case "uploaded":
      return 1;
    case "validating":
      return 2;
    case "ready":
      return 3;
    case "committing":
      return 4;
    case "completed":
      return 5;
    case "failed":
      return 2;
  }
}

export function ImportWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [profileName, setProfileName] = useState("");
  const [record, setRecord] = useState<ImportState | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (id: string) => {
    const response = await fetch(`/api/imports/${id}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as ImportState;
    setRecord(data);
    return data;
  }, []);

  const currentStatus = record?.status;

  useEffect(() => {
    if (!importId || step !== 3) return;
    if (currentStatus !== "validating" && currentStatus !== "committing") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      const data = await refresh(importId!);
      if (cancelled) return;
      if (!data || data.status === "completed" || data.status === "failed") return;
      if (data.status === "ready") return;
      timer = setTimeout(poll, 1500);
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [currentStatus, importId, refresh, step]);

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a CSV file.");
      return;
    }
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/imports", { method: "POST", body });
      const data = (await response.json()) as {
        error?: string;
        importId?: string;
        detection?: Detection;
        suggestedMapping?: ImportMapping;
      };
      if (!response.ok || !data.importId || !data.detection) {
        setError(data.error ?? "Could not upload the file.");
        return;
      }
      setImportId(data.importId);
      setDetection(data.detection);
      setMapping(data.suggestedMapping ?? {});
      setStep(2);
    } catch {
      setError("Could not upload the file.");
    } finally {
      setBusy(false);
    }
  }

  async function onValidate() {
    if (!importId) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/imports/${importId}/mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping, profileName: profileName.trim() || undefined }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Check the mapping.");
        return;
      }
      setStep(3);
      await refresh(importId);
    } catch {
      setError("Could not validate the mapping.");
    } finally {
      setBusy(false);
    }
  }

  async function onCommit() {
    if (!importId) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/imports/${importId}/commit`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not commit the import.");
        return;
      }
      await refresh(importId);
    } catch {
      setError("Could not commit the import.");
    } finally {
      setBusy(false);
    }
  }

  const selectedSamples = useMemo(() => {
    if (!detection) return new Map<CanonicalField, string[]>();
    const result = new Map<CanonicalField, string[]>();
    for (const field of CANONICAL_FIELD_DEFINITIONS) {
      const column = mapping[field.field];
      if (!column) continue;
      const index = detection.headers.indexOf(column);
      if (index < 0) continue;
      result.set(
        field.field,
        detection.sampleRows.map((row) => row[index] ?? "").filter((value) => value !== "").slice(0, 2)
      );
    }
    return result;
  }, [detection, mapping]);

  const activeStep = record ? statusStep(record.status) : step;
  const progress = record?.status === "completed" ? 100 : Math.min(95, (activeStep / 5) * 100);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Patient data"
        title="Import patients"
        description="Upload, map, validate and commit. Validation never writes patients; commit does."
        actions={<Badge variant="outline">CSV import</Badge>}
      />

      <Card className="app-panel">
        <CardContent className="p-6">
          <Progress value={progress} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-5">
            <span className={activeStep >= 1 ? "text-ink" : ""}>1. Upload</span>
            <span className={activeStep >= 2 ? "text-ink" : ""}>2. Map columns</span>
            <span className={activeStep >= 3 ? "text-ink" : ""}>3. Validate</span>
            <span className={activeStep >= 4 ? "text-ink" : ""}>4. Commit</span>
            <span className={activeStep >= 5 ? "text-ink" : ""}>5. Audit</span>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === 1 ? (
        <Card className="app-panel">
          <CardHeader>
            <CardTitle>Upload a CSV export</CardTitle>
            <CardDescription>
              Comma or semicolon, UTF-8 or Windows-1252, ISO or DD.MM.YYYY. Maximum 20 MB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import-file">Patient CSV</Label>
                <input
                  id="import-file"
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="block w-full cursor-pointer rounded-[7px] border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-[5px] file:border-0 file:bg-pill file:px-3 file:py-1 file:text-sm"
                  required
                />
              </div>
              <Button type="submit" disabled={busy}>
                <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload and detect columns"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 && detection ? (
        <Card className="app-panel">
          <CardHeader>
            <CardTitle>Confirm column mapping</CardTitle>
            <CardDescription>
              Detected {detection.encoding}
              {detection.hasBom ? " (BOM)" : ""} · delimiter “{detection.delimiter}” · {detection.rowCount} data rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {CANONICAL_FIELD_DEFINITIONS.map((field) => (
                <div key={field.field} className="space-y-1.5">
                  <Label htmlFor={`map-${field.field}`}>{field.label}</Label>
                  <Select
                    value={mapping[field.field] ?? NONE}
                    onValueChange={(value) => {
                      setMapping((current) => {
                        const next = { ...current };
                        if (value === NONE) delete next[field.field];
                        else next[field.field] = value;
                        return next;
                      });
                    }}
                  >
                    <SelectTrigger id={`map-${field.field}`}>
                      <SelectValue placeholder="Not mapped" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not mapped</SelectItem>
                      {detection.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                  {selectedSamples.get(field.field)?.length ? (
                    <p className="text-xs text-ink">
                      Sample: <span className="text-muted-foreground">{selectedSamples.get(field.field)?.join(" · ")}</span>
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Save mapping profile (optional)</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="e.g. Open Dental export"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={onValidate} disabled={busy}>
                {busy ? "Starting validation…" : "Validate mapping"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setRecord(null);
                  setImportId(null);
                  setDetection(null);
                }}
              >
                Upload a different file
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && importId ? (
        <Card className="app-panel">
          <CardHeader>
            <CardTitle>
              {record?.status === "completed"
                ? "Import complete"
                : record?.status === "failed"
                  ? "Validation needs attention"
                  : record?.status === "ready"
                    ? "Review before committing"
                    : "Validating rows"}
            </CardTitle>
            <CardDescription>
              {record
                ? `${record.rowCount} rows · ${record.validCount} valid · ${record.errorCount} with errors`
                : "Waiting for the worker…"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!record || record.status === "validating" || record.status === "committing" ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {record?.status === "committing"
                    ? "Writing patients, consents, appointments and the audit…"
                    : "Parsing, mapping, validating and normalizing. This page updates automatically."}
                </p>
                <Progress value={record?.status === "committing" ? 85 : 55} />
              </div>
            ) : null}

            {record?.status === "failed" ? (
              <Alert variant="destructive">
                <AlertDescription>{record.errorMessage ?? "No valid rows were found."}</AlertDescription>
              </Alert>
            ) : null}

            {record?.errorCount ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-heading text-sm font-medium">Validation errors</p>
                  <Button asChild size="sm" variant="outline">
                    <a href={`/api/imports/${record.id}/errors`}>Download error CSV</a>
                  </Button>
                </div>
                <div className="rounded-[10px] border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {record.errors.slice(0, 8).map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell className="align-top">{row.rowNumber}</TableCell>
                          <TableCell className="space-y-1">
                            {row.issues.map((issue, index) => (
                              <p key={`${issue.code}-${index}`} className="text-xs">
                                <Badge variant={issue.severity === "error" ? "destructive" : "warning"}>
                                  {issue.severity}
                                </Badge>{" "}
                                {issue.message}
                              </p>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            {record?.status === "ready" ? (
              <div className="space-y-3">
                <p className="font-heading text-sm font-medium">Valid rows preview</p>
                <div className="rounded-[10px] border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Last visit</TableHead>
                        <TableHead>Treatment</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {record.preview.map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell>{row.rowNumber}</TableCell>
                          <TableCell>
                            {[row.normalized?.firstName, row.normalized?.lastName].filter(Boolean).join(" ") || "—"}
                          </TableCell>
                          <TableCell>{row.normalized?.lastVisitAt ?? "—"}</TableCell>
                          <TableCell>{row.normalized?.treatmentType ?? "—"}</TableCell>
                          <TableCell>{row.normalized?.locationName ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={onCommit} disabled={busy || record.validCount === 0}>
                    {busy ? "Committing…" : `Commit ${record.validCount} valid rows`}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Adjust mapping
                  </Button>
                </div>
              </div>
            ) : null}

            {record?.status === "failed" ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Adjust mapping
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/app/overview">Back to overview</Link>
                </Button>
              </div>
            ) : null}

            {record?.status === "completed" && record.auditToken ? (
              <div className="space-y-3 rounded-[10px] bg-card p-4">
                <p className="font-heading text-lg font-medium">The audit is ready.</p>
                <p className="text-sm text-muted-foreground">
                  Share the tokenized report link. It expires automatically and can be revoked from the dashboard.
                </p>
                <div className="break-all rounded-[7px] border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  /audit/{record.auditToken}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/audit/${record.auditToken}`}>Open report</Link>
                  </Button>
                  <CopyLinkButton
                    url={`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/audit/${record.auditToken}`}
                  />
                  <Button asChild variant="outline">
                    <Link href="/app/overview">Back to overview</Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
