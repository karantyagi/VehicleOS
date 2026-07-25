/** US state / territory name → postal abbreviation (geocoding display). */
export const US_STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

export type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  state?: string;
  country_code?: string;
};

export type NominatimSearchResult = {
  place_id: number;
  display_name: string;
  address?: NominatimAddress;
};

export const abbreviateUsState = (state: string): string => {
  const trimmed = state.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return US_STATE_ABBREVIATIONS[trimmed] ?? trimmed;
};

export const buildNominatimSearchQuery = (input: { shop: string; hintCity?: string }): string => {
  const shop = input.shop.trim();
  if (input.hintCity?.trim()) {
    return `${shop}, ${input.hintCity.trim()}, USA`;
  }
  return `${shop}, USA`;
};

export const buildNominatimSearchUrl = (
  input: { shop: string; hintCity?: string },
  baseUrl = "https://nominatim.openstreetmap.org/search",
): string => {
  const url = new URL(baseUrl);
  url.searchParams.set("q", buildNominatimSearchQuery(input));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("limit", "5");
  return url.toString();
};

export const formatNominatimAddress = (address: NominatimAddress | undefined): string | undefined => {
  if (!address) return undefined;
  const city = address.city ?? address.town ?? address.village ?? address.hamlet;
  const state = address.state;
  if (!city || !state) return undefined;
  return `${city}, ${abbreviateUsState(state)}`;
};

export const parseNominatimSearchResponse = (
  shop: string,
  results: NominatimSearchResult[],
): import("./lookup-shop-location-port.js").LookupShopLocationResult => {
  if (results.length === 0) {
    return {
      status: "not_found",
      shop,
      message: "No geocoding match found for this shop name.",
    };
  }

  const locations = results
    .map((result) => formatNominatimAddress(result.address))
    .filter((location): location is string => Boolean(location));
  const uniqueLocations = [...new Set(locations)];

  if (uniqueLocations.length === 1) {
    const match = results.find((result) => formatNominatimAddress(result.address) === uniqueLocations[0]);
    return {
      status: "resolved",
      shop,
      shopLocation: uniqueLocations[0],
      placeId: match ? String(match.place_id) : undefined,
      source: "nominatim",
    };
  }

  if (uniqueLocations.length > 1) {
    return {
      status: "ambiguous",
      shop,
      candidates: uniqueLocations.slice(0, 5),
      message: `Multiple locations found for ${shop}. Confirm one or enter manually.`,
    };
  }

  return {
    status: "not_found",
    shop,
    message: "Geocoding returned results without a usable city and state.",
  };
};

export type NominatimFetch = (url: string, init?: RequestInit) => Promise<Response>;

export const createNominatimShopLocationLookup = (deps: {
  fetch: NominatimFetch;
  userAgent: string;
  baseUrl?: string;
}): import("./lookup-shop-location-port.js").ShopLocationLookupPort => ({
  lookupShopLocation: async (input) => {
    const url = buildNominatimSearchUrl(input, deps.baseUrl);
    const response = await deps.fetch(url, {
      headers: {
        "User-Agent": deps.userAgent,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        status: "not_found",
        shop: input.shop,
        message: `Geocoding service returned ${response.status}.`,
      };
    }

    const payload = (await response.json()) as NominatimSearchResult[];
    return parseNominatimSearchResponse(input.shop, Array.isArray(payload) ? payload : []);
  },
});
