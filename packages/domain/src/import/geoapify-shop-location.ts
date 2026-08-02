import type { LookupShopLocationResult, ShopLocationLookupPort } from "./lookup-shop-location-port.js";

/** US state / territory name → postal abbreviation (location display). */
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

export type GeoapifyFeatureProperties = {
  place_id?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  state?: string;
  state_code?: string;
};

export type GeoapifySearchFeature = {
  properties?: GeoapifyFeatureProperties;
};

export type GeoapifySearchResponse = {
  features?: GeoapifySearchFeature[];
};

export const abbreviateUsState = (state: string): string => {
  const trimmed = state.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  if (/^US-[A-Z]{2}$/i.test(trimmed)) return trimmed.slice(-2).toUpperCase();
  return US_STATE_ABBREVIATIONS[trimmed] ?? trimmed;
};

export const buildGeoapifySearchText = (input: { shop: string; hintCity?: string }): string => {
  const shop = input.shop.trim();
  return input.hintCity?.trim() ? `${shop}, ${input.hintCity.trim()}, USA` : shop;
};

export const buildGeoapifySearchUrl = (
  input: { shop: string; hintCity?: string },
  apiKey: string,
  baseUrl = "https://api.geoapify.com/v1/geocode/search",
): string => {
  const url = new URL(baseUrl);
  url.searchParams.set("text", buildGeoapifySearchText(input));
  url.searchParams.set("filter", "countrycode:us");
  url.searchParams.set("format", "geojson");
  url.searchParams.set("limit", "5");
  url.searchParams.set("apiKey", apiKey);
  return url.toString();
};

export const formatGeoapifyLocation = (
  properties: GeoapifyFeatureProperties | undefined,
): string | undefined => {
  if (!properties) return undefined;
  const city = properties.city ?? properties.town ?? properties.village ?? properties.hamlet;
  const state = properties.state_code ?? properties.state;
  if (!city || !state) return undefined;
  return `${city}, ${abbreviateUsState(state)}`;
};

export const parseGeoapifySearchResponse = (
  shop: string,
  payload: GeoapifySearchResponse,
): LookupShopLocationResult => {
  const features = Array.isArray(payload.features) ? payload.features : [];
  const locations = features
    .map((feature) => formatGeoapifyLocation(feature.properties))
    .filter((location): location is string => Boolean(location));
  const uniqueLocations = [...new Set(locations)];

  if (uniqueLocations.length === 1) {
    const match = features.find(
      (feature) => formatGeoapifyLocation(feature.properties) === uniqueLocations[0],
    );
    return {
      status: "resolved",
      shop,
      shopLocation: uniqueLocations[0],
      placeId: match?.properties?.place_id,
      source: "geoapify",
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
    message: "No usable city and state were found for this shop.",
  };
};

export type GeoapifyFetch = (url: string, init?: RequestInit) => Promise<Response>;

export const createGeoapifyShopLocationLookup = (deps: {
  apiKey?: string;
  fetch: GeoapifyFetch;
  baseUrl?: string;
}): ShopLocationLookupPort => ({
  lookupShopLocation: async (input) => {
    const apiKey = deps.apiKey?.trim();
    if (!apiKey) {
      return {
        status: "not_initialized",
        shop: input.shop,
        message: "Shop location lookup is not configured. Enter City, ST to continue.",
      };
    }

    let response: Response;
    try {
      response = await deps.fetch(
        buildGeoapifySearchUrl(input, apiKey, deps.baseUrl),
        { headers: { Accept: "application/geo+json, application/json" } },
      );
    } catch {
      return {
        status: "not_found",
        shop: input.shop,
        message: "Shop location lookup is temporarily unavailable. Enter City, ST to continue.",
      };
    }

    if (!response.ok) {
      return {
        status: "not_found",
        shop: input.shop,
        message: "Shop location lookup could not find a result. Enter City, ST to continue.",
      };
    }

    const payload = (await response.json()) as GeoapifySearchResponse;
    return parseGeoapifySearchResponse(input.shop, payload);
  },
});
