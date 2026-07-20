import { getApiServices, type ApiServices } from "@vehicleos/server";

let cachedServices: ApiServices | null = null;

export const getServices = (): ApiServices => {
  if (!cachedServices) cachedServices = getApiServices();
  return cachedServices;
};
