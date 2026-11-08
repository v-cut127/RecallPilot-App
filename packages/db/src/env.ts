import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

function findRepoRoot(start: string): string | null {
  let current = path.resolve(start);
  for (let depth = 0; depth < 6; depth += 1) {
    const packageJson = path.join(current, "package.json");
    if (fs.existsSync(packageJson)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(packageJson, "utf8")) as { name?: string };
        if (parsed.name === "recallpilot-app") return current;
      } catch {
        // ignore malformed package.json
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

export const REPO_ROOT = findRepoRoot(process.cwd()) ?? findRepoRoot(import.meta.dirname) ?? process.cwd();

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  for (const filename of [".env.local", ".env"]) {
    const file = path.join(REPO_ROOT, filename);
    if (fs.existsSync(file)) {
      dotenv.config({ path: file, override: false });
    }
  }
}

export function getDatabaseUrl(): string {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Run `npm run db:local:start` and copy .env.example to .env.local."
    );
  }
  return url;
}

export function isLocalDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}
