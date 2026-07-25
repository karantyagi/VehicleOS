const SHOP_LOCATION_BY_KEY: Record<string, string> = {
  "ira acura westwood": "Westwood, MA",
  "metrowest acura": "Framingham, MA",
  "costco tire center": "Waltham, MA",
  "automax framingham": "Framingham, MA",
  "prime acura": "Westwood, MA",
  massachusetts: "Massachusetts",
};

const ADDRESS_LINE = /,\s*[A-Z]{2}\b|\b[A-Z]{2}\s+\d{5}\b/;

export const looksLikeShopAddressLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "Date") return false;
  return ADDRESS_LINE.test(trimmed);
};

export const inferShopLocation = (shop: string): string | undefined => {
  const normalized = shop.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return undefined;

  const direct = SHOP_LOCATION_BY_KEY[normalized];
  if (direct) return direct;

  for (const [key, location] of Object.entries(SHOP_LOCATION_BY_KEY)) {
    if (normalized.includes(key)) return location;
  }

  if (normalized.includes("westwood")) return "Westwood, MA";
  if (normalized.includes("framingham")) return "Framingham, MA";

  return undefined;
};

export const resolveShopLocation = (input: {
  shop: string;
  shopLocation?: string | null;
}): string | undefined => {
  const explicit = input.shopLocation?.trim();
  if (explicit) return explicit;
  return inferShopLocation(input.shop);
};
