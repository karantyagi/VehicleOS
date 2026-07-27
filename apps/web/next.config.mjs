import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(__dirname, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vehicleos/server", "@vehicleos/domain", "@vehicleos/knowledge"],
  experimental: {
    // Next 14.2: tracing options live under experimental (top-level keys are ignored).
    outputFileTracingRoot: monorepoRoot,
    // Include globs are resolved from this app dir (apps/web), not the monorepo root.
    outputFileTracingIncludes: {
      "/api/**": ["../../packages/knowledge/**/*"],
    },
    serverComponentsExternalPackages: ["pg"],
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
