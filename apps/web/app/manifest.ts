import type { MetadataRoute } from "next";
import { pwaConfig } from "../lib/pwa-config";
import { siteConfig } from "../lib/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: pwaConfig.name,
    short_name: pwaConfig.shortName,
    description: siteConfig.metaDescription,
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: pwaConfig.backgroundColor,
    theme_color: pwaConfig.themeColorLight,
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Capture receipt",
        short_name: "Receipts",
        description: "Photo or PDF at the shop",
        url: "/?section=receipts",
        icons: [{ src: "/icons/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
      },
    ],
  };
}
