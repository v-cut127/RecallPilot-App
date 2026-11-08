import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const rootCandidates = [
  process.cwd(),
  path.resolve(process.cwd(), "../.."),
  path.resolve(process.cwd(), "../../.."),
];
const root = rootCandidates.find((candidate) => fs.existsSync(path.join(candidate, "package.json")) && fs.existsSync(path.join(candidate, "supabase"))) ?? process.cwd();

for (const filename of [".env.local", ".env"]) {
  const file = path.join(root, filename);
  if (fs.existsSync(file)) dotenv.config({ path: file, override: false });
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
