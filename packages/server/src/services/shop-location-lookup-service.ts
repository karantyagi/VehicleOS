import {
  createGeoapifyShopLocationLookup,
  stubLookupShopLocation,
  type GeoapifyFetch,
  type ShopLocationLookupPort,
} from "@vehicleos/domain";

export type ShopLocationLookupServiceOptions = {
  provider?: "geoapify" | "stub";
  apiKey?: string;
  fetchImpl?: GeoapifyFetch;
  baseUrl?: string;
};

export const createShopLocationLookupService = (
  options: ShopLocationLookupServiceOptions = {},
): ShopLocationLookupPort => {
  const provider =
    options.provider ??
    (process.env.SHOP_LOOKUP_PROVIDER === "stub" || process.env.SHOP_LOOKUP_DISABLED === "true"
      ? "stub"
      : "geoapify");

  if (provider === "stub") {
    return {
      lookupShopLocation: async (input) => stubLookupShopLocation(input),
    };
  }

  return createGeoapifyShopLocationLookup({
    fetch: options.fetchImpl ?? fetch,
    apiKey: options.apiKey ?? process.env.GEOAPIFY_API_KEY,
    baseUrl: options.baseUrl ?? process.env.GEOAPIFY_GEOCODING_BASE_URL,
  });
};
