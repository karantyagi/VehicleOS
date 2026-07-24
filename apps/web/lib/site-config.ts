const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://vehicleos.app";

export const siteConfig = {
  name: "VehicleOS",
  metaTitle: "VehicleOS — App",
  metaDescription: "Operational memory for vehicle ownership. Free early access.",
  marketingUrl,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@vehicleos.app",
  legal: {
    privacy: `${marketingUrl}/privacy`,
    terms: `${marketingUrl}/terms`,
    security: `${marketingUrl}/security`,
  },
} as const;
