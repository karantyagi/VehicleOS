import type { LookupShopLocationInput, LookupShopLocationResult } from "./lookup-shop-location-port.js";

/** Stub Places lookup — structured search ships post-freeze (ADR-011 P2). */
export const stubLookupShopLocation = (
  input: LookupShopLocationInput,
): LookupShopLocationResult => ({
  status: "not_initialized",
  shop: input.shop,
  message:
    "Places lookup is not initialized yet. Add city/state manually or confirm from your saved shop memory.",
});
