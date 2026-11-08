import { execSync } from "node:child_process";

export default function globalSetup(): void {
  const cwd = process.cwd();
  if (!process.env.DATABASE_URL) {
    execSync("node scripts/local-db.mjs ensure", { cwd, stdio: "inherit" });
  }
  execSync("npm run db:bootstrap", { cwd, stdio: "inherit" });
  execSync("npm run seed:data", { cwd, stdio: "inherit" });
}
