"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, AlertDescription, Button, Input, Label } from "@recallpilot/ui";
import { signUpAction, signInAction, magicLinkAction, type AuthActionState } from "@/lib/auth-actions";

const initialState: AuthActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Working…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: AuthActionState }) {
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }
  if (state.success) {
    return (
      <Alert variant="success">
        <AlertDescription>
          {state.success}
          {state.devLink ? (
            <span className="mt-2 block break-all text-xs">
              Development link:{" "}
              <a href={state.devLink} className="text-accent underline">
                {state.devLink}
              </a>
            </span>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="space-y-2">
        <Label htmlFor="fullName">Your name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required placeholder="Alex Meyer" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="practiceName">Practice name</Label>
        <Input id="practiceName" name="practiceName" required placeholder="Bright Dental Group" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="alex@brightdental.de" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="At least 8 characters"
        />
      </div>
      <SubmitButton label="Create workspace" />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function SignInForm() {
  const [state, action] = useActionState(signInAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" name="email" type="email" autoComplete="email" required placeholder="alex@brightdental.de" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Your password"
        />
      </div>
      <SubmitButton label="Sign in" />
    </form>
  );
}

export function MagicLinkForm() {
  const [state, action] = useActionState(magicLinkAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email</Label>
        <Input id="magic-email" name="email" type="email" autoComplete="email" required placeholder="alex@brightdental.de" />
      </div>
      <SubmitButton label="Email me a sign-in link" />
    </form>
  );
}
