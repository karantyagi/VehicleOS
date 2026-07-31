import { getApiServices, type ApiServices } from "@vehicleos/server";

let cachedServices: ApiServices | null = null;

type VehicleOsGlobal = typeof globalThis & {
  __vehicleOsApiServices?: ApiServices;
};

export const getServices = (): ApiServices => {
  // Next.js compiles route handlers independently in development. Keep the
  // fallback in-memory repository on globalThis so onboarding, capture, and
  // vehicle-state routes share one demo session across those bundles/HMR.
  if (process.env.NODE_ENV === "development") {
    const vehicleOsGlobal = globalThis as VehicleOsGlobal;
    vehicleOsGlobal.__vehicleOsApiServices ??= getApiServices();
    return vehicleOsGlobal.__vehicleOsApiServices;
  }

  if (!cachedServices) cachedServices = getApiServices();
  return cachedServices;
};
