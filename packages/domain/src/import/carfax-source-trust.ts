import { normalizeShopKey } from "./shop-location-keys.js";

export type CarfaxSourceTrust = "provider" | "owner_reported" | "owner_diy" | "state_record";

/**
 * CARFAX sometimes identifies the reporter rather than a service business.
 * Those rows are valid evidence, but must not inherit the trust of a named shop.
 */
export const resolveCarfaxSourceTrust = (shop: string): CarfaxSourceTrust => {
  switch (normalizeShopKey(shop)) {
    case "self reported":
      return "owner_reported";
    case "self-service (diy)":
      return "owner_diy";
    case "massachusetts":
      return "state_record";
    default:
      return "provider";
  }
};

export const isCarfaxLocationLookupApplicable = (shop: string): boolean =>
  resolveCarfaxSourceTrust(shop) === "provider";
