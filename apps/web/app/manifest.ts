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
        name: "Home",
        short_name: "Home",
        description: "See what needs attention",
        url: "/?section=reminders",
        icons: [{ src: "/icons/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
      },
      {
        name: "Add a record",
        short_name: "Capture",
        description: "Capture a receipt photo or voice note",
        url: "/capture/receipt",
        icons: [{ src: "/icons/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
      },
      {
        name: "Maintenance",
        short_name: "Maintenance",
        description: "Review schedule and history",
        url: "/?section=timeline",
        icons: [{ src: "/icons/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
      },
    ],
  };
}
