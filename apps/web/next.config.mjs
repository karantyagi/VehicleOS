import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Monorepo: trace serverless deps from repo root so @vehicleos/knowledge JSON ships to Vercel.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@vehicleos/server", "@vehicleos/domain", "@vehicleos/knowledge"],
  experimental: {
    serverComponentsExternalPackages: ["pg"],
    outputFileTracingIncludes: {
      "/api/catalog/vehicles": ["packages/knowledge/**/*"],
      "/api/catalog/supported": ["packages/knowledge/**/*"],
    },
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
