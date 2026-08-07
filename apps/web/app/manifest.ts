import type { MetadataRoute } from "next";
import { pwaConfig } from "../lib/pwa-config";
import { siteConfig } from "../lib/site-config";

type VehicleOsManifest = Omit<MetadataRoute.Manifest, "share_target"> & {
  share_target: {
    action: string;
    method: "POST";
    enctype: "multipart/form-data";
    params: {
      files: Array<{
        name: string;
        accept: string[];
      }>;
    };
  };
};

export default function manifest(): VehicleOsManifest {
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
        src: "/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
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
        name: "Service note",
        short_name: "Note",
        description: "Write a service note",
        url: "/capture/receipt?capture=note",
        icons: [{ src: "/icons/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
      },
      {
        name: "Receipt",
        short_name: "Receipt",
        description: "Capture a receipt photo or PDF",
        url: "/capture/receipt?capture=receipt",
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
    share_target: {
      action: "/capture/receipt?shared=ready",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        files: [
          {
            name: "receipt",
            accept: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"],
          },
        ],
      },
    },
  };
}
