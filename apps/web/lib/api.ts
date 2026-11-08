import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, getOrgContext, type OrgContext } from "./auth";

export async function requireApiOrg(): Promise<
  { context: OrgContext; response: null } | { context: null; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { context: null, response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  }
  const context = await getOrgContext();
  if (!context) {
    return {
      context: null,
      response: NextResponse.json({ error: "Create a practice workspace first." }, { status: 403 }),
    };
  }
  return { context, response: null };
}

export function safeFilename(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120) || "upload.csv"
  );
}
