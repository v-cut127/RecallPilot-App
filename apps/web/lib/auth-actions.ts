"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPool } from "@recallpilot/db";
import { hashPassword, verifyPassword } from "@recallpilot/core/password";
import { getEmailAdapter } from "@recallpilot/integrations/email";
import {
  appUrl,
  clearSessionCookie,
  createSupabaseServerClient,
  findLocalUserByEmail,
  getAuthMode,
  getCurrentUser,
  setSessionCookie,
} from "./auth";
import { createOrganizationForUser, generateLocalToken } from "./org";

export interface AuthActionState {
  error?: string;
  success?: string;
  devLink?: string;
}

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  practiceName: z.string().trim().min(2, "Enter your practice name.").max(160),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(200),
});

export async function signUpAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    practiceName: formData.get("practiceName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { fullName, practiceName, email, password } = parsed.data;

  if (getAuthMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (data.user && data.session) {
      await createOrganizationForUser({ userId: data.user.id, practiceName, fullName });
      redirect("/onboarding");
    }
    return { success: "Check your email to confirm your account, then sign in." };
  }

  const existing = await findLocalUserByEmail(email);
  if (existing) return { error: "An account with this email already exists. Sign in instead." };

  const passwordHash = hashPassword(password);
  const result = await getPool().query<{ id: string }>(
    `insert into auth.users (id, email, encrypted_password, raw_user_meta_data, email_confirmed_at)
     values (gen_random_uuid(), $1, $2, $3::jsonb, now())
     returning id`,
    [email, passwordHash, JSON.stringify({ full_name: fullName })]
  );
  const userId = result.rows[0]?.id;
  if (!userId) return { error: "Could not create the account. Try again." };

  await createOrganizationForUser({ userId, practiceName, fullName });
  await setSessionCookie(userId, email);
  redirect("/onboarding");
}

export async function signInAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { email, password } = parsed.data;

  if (getAuthMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    redirect("/app/overview");
  }

  const result = await getPool().query<{ id: string; encrypted_password: string | null }>(
    "select id, encrypted_password from auth.users where lower(email) = lower($1) limit 1",
    [email]
  );
  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.encrypted_password)) {
    return { error: "Email or password is incorrect." };
  }
  await setSessionCookie(user.id, email);
  redirect("/app/overview");
}

export async function magicLinkAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };

  if (getAuthMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.data,
      options: { emailRedirectTo: `${appUrl()}/auth/callback` },
    });
    if (error) return { error: error.message };
    return { success: "Check your email for a sign-in link." };
  }

  const token = generateLocalToken();
  await getPool().query(
    "insert into auth.magic_links (email, token, expires_at) values ($1, $2, now() + interval '15 minutes')",
    [email.data, token]
  );
  const url = `${appUrl()}/auth/magic?token=${encodeURIComponent(token)}`;
  await getEmailAdapter().send({
    to: email.data,
    subject: "Your RecallPilot sign-in link",
    text: `Sign in to RecallPilot: ${url}\n\nThis link expires in 15 minutes.`,
    html: `<p>Sign in to RecallPilot:</p><p><a href="${url}">${url}</a></p><p>This link expires in 15 minutes.</p>`,
  });
  return {
    success: "Check your email for a sign-in link.",
    devLink: process.env.NODE_ENV === "production" ? undefined : url,
  };
}

export async function signOutAction(): Promise<void> {
  if (getAuthMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  await clearSessionCookie();
  redirect("/");
}

export async function createOrgAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = z
    .object({
      practiceName: z.string().trim().min(2, "Enter your practice name.").max(160),
    })
    .safeParse({ practiceName: formData.get("practiceName") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a practice name." };

  await createOrganizationForUser({
    userId: user.id,
    practiceName: parsed.data.practiceName,
    fullName: user.fullName,
  });
  revalidatePath("/onboarding");
  redirect("/app/import");
}
