"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, AlertDescription, Button, Input, Label } from "@recallpilot/ui";
import { createOrgAction, type AuthActionState } from "@/lib/auth-actions";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create practice workspace"}
    </Button>
  );
}

export function CreateOrgForm() {
  const [state, action] = useActionState(createOrgAction, initialState);
  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="practiceName">Practice name</Label>
        <Input id="practiceName" name="practiceName" required placeholder="Bright Dental Group" />
      </div>
      <SubmitButton />
      <p className="text-xs text-muted-foreground">
        We create one main location and default hygiene, check-up and treatment recall rules. You can add locations after
        the first import.
      </p>
    </form>
  );
}
