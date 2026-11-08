import { NextResponse } from "next/server";
import { createSupabaseServerClient, getAuthMode } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (getAuthMode() === "supabase" && code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/app/overview", url.origin));
  }

  return NextResponse.redirect(new URL("/login?magicError=1", url.origin));
}
