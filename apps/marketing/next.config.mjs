import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(__dirname, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vehicleos/server", "@vehicleos/domain", "@vehicleos/knowledge"],
  experimental: {
    outputFileTracingRoot: monorepoRoot,
    outputFileTracingIncludes: {
      "/api/**": ["../../packages/knowledge/**/*", "knowledge-data/**/*"],
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
