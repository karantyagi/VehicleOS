import type { LookupShopLocationInput, LookupShopLocationResult } from "./lookup-shop-location-port.js";
import { resolveShopLocation } from "./infer-shop-location.js";
import { stubLookupShopLocation } from "./stub-lookup-shop-location.js";

export type ResolveShopLocationWithLookupInput = LookupShopLocationInput & {
  shopLocation?: string | null;
  ownerShopLocations?: Record<string, string>;
};

export const resolveShopLocationWithLookup = async (
  input: ResolveShopLocationWithLookupInput,
  lookupPort?: { lookupShopLocation: (input: LookupShopLocationInput) => Promise<LookupShopLocationResult> },
): Promise<{ shopLocation?: string; lookup?: LookupShopLocationResult }> => {
  const resolved = resolveShopLocation({
    shop: input.shop,
    shopLocation: input.shopLocation,
    ownerShopLocations: input.ownerShopLocations,
  });
  if (resolved) return { shopLocation: resolved };

  const lookup = lookupPort
    ? await lookupPort.lookupShopLocation({ shop: input.shop, hintCity: input.hintCity })
    : stubLookupShopLocation({ shop: input.shop, hintCity: input.hintCity });

  if (lookup.status === "resolved") {
    return { shopLocation: lookup.shopLocation, lookup };
  }

  return { lookup };
};
