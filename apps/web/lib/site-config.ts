export const siteConfig = {
  name: "VehicleOS",
  metaTitle: "VehicleOS — App",
  metaDescription: "Operational memory for vehicle ownership. Free early access.",
  marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://vehicleos.app",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
} as const;
