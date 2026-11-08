import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  asc,
  desc,
  eq,
  getDb,
  getPool,
  locations,
  memberships,
  organizations,
  profiles,
  type Location,
  type Membership,
  type Organization,
} from "@recallpilot/db";

export const SESSION_COOKIE = "rp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type AuthMode = "local" | "supabase";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
}

export interface OrgContext {
  user: SessionUser;
  membership: Membership;
  organization: Organization;
  locations: Location[];
}

export function getAuthMode(): AuthMode {
  const explicit = process.env.AUTH_PROVIDER;
  if (explicit === "supabase" || explicit === "local") return explicit;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return "supabase";
  // The local adapter is a development/E2E fallback. A deployed app without
  // Supabase configuration fails closed instead of silently accepting local auth.
  return process.env.NODE_ENV === "production" ? "supabase" : "local";
}

function authSecret(): string {
  return process.env.AUTH_SECRET ?? "recallpilot-local-development-secret-change-me";
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function signSessionToken(userId: string, email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, email, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })
  ).toString("base64url");
  const signature = createHmac("sha256", authSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): { sub: string; email: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", authSecret()).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      email?: string;
      exp?: number;
    };
    if (!parsed.sub || !parsed.email || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: parsed.sub, email: parsed.email };
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string, email: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signSessionToken(userId, email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase auth is not configured.");
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; middleware refreshes them.
        }
      },
    },
  });
}

async function getLocalUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  if (!session) return null;
  const db = getDb();
  const [profile] = await db
    .select({ id: profiles.id, email: profiles.email, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, session.sub))
    .limit(1);
  if (!profile) return null;
  return { id: profile.id, email: profile.email ?? session.email, fullName: profile.fullName };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (getAuthMode() === "local") return getLocalUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const db = getDb();
  const [profile] = await db
    .select({ fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, data.user.id))
    .limit(1);
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    fullName: profile?.fullName ?? (data.user.user_metadata?.full_name as string | undefined) ?? null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getOrgContext(): Promise<OrgContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = getDb();
  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .orderBy(desc(memberships.createdAt))
    .limit(1);
  if (!membership) return null;
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, membership.orgId))
    .limit(1);
  if (!organization) return null;
  const orgLocations = await db
    .select()
    .from(locations)
    .where(eq(locations.orgId, membership.orgId))
    .orderBy(asc(locations.name));
  return { user, membership, organization, locations: orgLocations };
}

export async function requireOrgContext(): Promise<OrgContext> {
  const context = await getOrgContext();
  if (!context) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    redirect("/onboarding");
  }
  return context;
}

export async function findLocalUserByEmail(email: string): Promise<{ id: string } | null> {
  const result = await getPool().query<{ id: string }>("select id from auth.users where lower(email) = lower($1) limit 1", [
    email,
  ]);
  return result.rows[0] ?? null;
}
