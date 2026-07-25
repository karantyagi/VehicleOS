/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vehicleos/server", "@vehicleos/domain", "@vehicleos/knowledge"],
  experimental: {
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
