import type { LookupShopLocationResult } from "./lookup-shop-location-port.js";

export type ShopLocationHintStatus = LookupShopLocationResult["status"] | "skipped";

export type ShopLocationHint = {
  shop: string;
  status: ShopLocationHintStatus;
  candidates?: string[];
  message?: string;
};

export const shopLocationHintFromLookup = (
  shop: string,
  lookup?: LookupShopLocationResult,
): ShopLocationHint | undefined => {
  if (!lookup) return undefined;

  if (lookup.status === "ambiguous") {
    return {
      shop,
      status: "ambiguous",
      candidates: lookup.candidates,
      message: lookup.message,
    };
  }

  if (lookup.status === "not_found" || lookup.status === "not_initialized") {
    return {
      shop,
      status: lookup.status,
      message: lookup.message,
    };
  }

  return undefined;
};
