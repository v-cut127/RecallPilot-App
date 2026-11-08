"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, Button, Checkbox, Input, Label } from "@recallpilot/ui";
import { Upload } from "lucide-react";

export function PublicAuditForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a CSV file to audit.");
      return;
    }
    setUploading(true);
    try {
      const response = await fetch("/api/audit/leads", { method: "POST", body: formData });
      const data = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || !data.token) {
        setError(data.error ?? "Could not start the audit. Try again.");
        setUploading(false);
        return;
      }
      router.push(`/audit/${data.token}`);
    } catch {
      setError("Could not upload the file. Check your connection and try again.");
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@practice.de" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="practiceName">Practice name</Label>
          <Input id="practiceName" name="practiceName" required placeholder="Bright Dental Group" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">Patient CSV export</Label>
        <Input id="file" name="file" type="file" accept=".csv,.txt,text/csv,text/plain" required />
        <p className="text-xs text-muted-foreground">
          UTF-8 or Windows-1252, comma or semicolon, ISO or DD.MM.YYYY dates. Maximum 20 MB. Raw uploads are purged after
          24 hours.
        </p>
      </div>
      <label className="flex items-start gap-3 rounded-[10px] bg-card p-3 text-sm text-muted-foreground">
        <Checkbox name="consent" value="yes" required className="mt-0.5" />
        <span>
          Email me the audit report. I understand this is an estimate based on stated assumptions, not a guarantee of
          revenue. I can request deletion at any time.
        </span>
      </label>
      <Button type="submit" size="lg" disabled={uploading}>
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading and starting audit…" : "Run the free audit"}
      </Button>
    </form>
  );
}
