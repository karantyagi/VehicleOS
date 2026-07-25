import {
  createNominatimShopLocationLookup,
  stubLookupShopLocation,
  type NominatimFetch,
  type ShopLocationLookupPort,
} from "@vehicleos/domain";

const DEFAULT_USER_AGENT = "VehicleOS/0.1 (shop-location-lookup; contact@vehicleos.app)";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export type ShopLocationLookupServiceOptions = {
  provider?: "nominatim" | "stub";
  userAgent?: string;
  minIntervalMs?: number;
  fetchImpl?: NominatimFetch;
};

export const createShopLocationLookupService = (
  options: ShopLocationLookupServiceOptions = {},
): ShopLocationLookupPort => {
  const provider =
    options.provider ??
    (process.env.SHOP_LOOKUP_PROVIDER === "stub" || process.env.SHOP_LOOKUP_DISABLED === "true"
      ? "stub"
      : "nominatim");

  if (provider === "stub") {
    return {
      lookupShopLocation: async (input) => stubLookupShopLocation(input),
    };
  }

  const minIntervalMs = options.minIntervalMs ?? 1100;
  const fetchImpl = options.fetchImpl ?? fetch;
  const nominatim = createNominatimShopLocationLookup({
    fetch: fetchImpl,
    userAgent: options.userAgent ?? process.env.SHOP_LOOKUP_USER_AGENT ?? DEFAULT_USER_AGENT,
  });

  let chain: Promise<unknown> = Promise.resolve();
  let lastLookupFinishedAt = 0;

  return {
    lookupShopLocation: async (input) => {
      const run = async () => {
        const waitMs = Math.max(0, minIntervalMs - (Date.now() - lastLookupFinishedAt));
        if (waitMs > 0) await sleep(waitMs);
        const result = await nominatim.lookupShopLocation(input);
        lastLookupFinishedAt = Date.now();
        return result;
      };

      const resultPromise = chain.then(run, run);
      chain = resultPromise.then(
        () => undefined,
        () => undefined,
      );
      return resultPromise;
    },
  };
};
