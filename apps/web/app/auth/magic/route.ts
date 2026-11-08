import { NextResponse } from "next/server";
import { getPool } from "@recallpilot/db";
import { setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/login?magicError=1", url.origin));

  const pool = getPool();
  const result = await pool.query<{ email: string }>(
    `update auth.magic_links
     set used_at = now()
     where token = $1 and used_at is null and expires_at > now()
     returning email`,
    [token]
  );
  const email = result.rows[0]?.email;
  if (!email) return NextResponse.redirect(new URL("/login?magicError=1", url.origin));

  const user = await pool.query<{ id: string }>("select id from auth.users where lower(email) = lower($1) limit 1", [
    email,
  ]);
  const userId = user.rows[0]?.id;
  if (!userId) return NextResponse.redirect(new URL("/login?magicError=1", url.origin));

  await setSessionCookie(userId, email);
  return NextResponse.redirect(new URL("/app/overview", url.origin));
}
