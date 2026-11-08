import fs from "node:fs";
import path from "node:path";

function findRepoRoot(start: string): string | null {
  let current = path.resolve(start);
  for (let depth = 0; depth < 8; depth += 1) {
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

export const REPO_ROOT =
  findRepoRoot(process.cwd()) ?? findRepoRoot(import.meta.dirname) ?? process.cwd();

export function resolveFromRepoRoot(value: string): string {
  return path.isAbsolute(value) ? value : path.join(REPO_ROOT, value);
}
