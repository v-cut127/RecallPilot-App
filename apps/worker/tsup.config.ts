import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  external: [
    "pg",
    "pg-boss",
    "drizzle-orm",
    "dotenv",
    "date-fns",
    "zod",
    "@react-pdf/renderer",
    "react",
    "react-dom",
    "@supabase/supabase-js",
  ],
  noExternal: ["@recallpilot/core", "@recallpilot/db", "@recallpilot/integrations"],
});
