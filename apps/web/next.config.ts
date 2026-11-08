import path from "node:path";
import dotenv from "dotenv";
import type { NextConfig } from "next";

// The workspace keeps local secrets in the repository root. Next loads env files
// relative to apps/web, so load the root files here for build and runtime.
for (const file of [".env.local", ".env"]) {
  dotenv.config({ path: path.resolve(process.cwd(), "../..", file), override: false });
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    "@recallpilot/core",
    "@recallpilot/db",
    "@recallpilot/integrations",
    "@recallpilot/ui",
  ],
  serverExternalPackages: ["pg", "pg-boss"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
