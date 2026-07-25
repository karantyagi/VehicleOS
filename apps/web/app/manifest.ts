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
    display_override: ["standalone", "browser"],
    orientation: "portrait-primary",
    background_color: pwaConfig.backgroundColor,
    theme_color: pwaConfig.themeColorLight,
    prefer_related_applications: false,
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
        name: "Reminders",
        short_name: "Reminders",
        description: "Calendar-first maintenance nudges",
        url: "/?section=reminders",
        icons: [{ src: "/icons/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
      },
      {
        name: "Import history",
        short_name: "Import",
        description: "Hand off CARFAX or portal PDFs",
        url: "/?section=imports",
        icons: [{ src: "/icons/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
      },
      {
        name: "Upload receipt",
        short_name: "Receipts",
        description: "Photo or PDF at the shop",
        url: "/capture/receipt",
        icons: [{ src: "/icons/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
      },
      {
        name: "Owner verification",
        short_name: "Verify",
        description: "Resolve conflicts the assistant can't settle alone",
        url: "/?section=now",
        icons: [{ src: "/icons/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
      },
    ],
  };
}
