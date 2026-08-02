export type LookupShopLocationInput = {
  shop: string;
  hintCity?: string;
};

export type LookupShopLocationResult =
  | {
      status: "resolved";
      shop: string;
      shopLocation: string;
      placeId?: string;
      source: "geoapify" | "owner_memory" | "curated_pack";
    }
  | {
      status: "ambiguous";
      shop: string;
      candidates: string[];
      message: string;
    }
  | {
      status: "not_initialized";
      shop: string;
      message: string;
    }
  | {
      status: "not_found";
      shop: string;
      message: string;
    };

export type ShopLocationLookupPort = {
  lookupShopLocation: (input: LookupShopLocationInput) => Promise<LookupShopLocationResult>;
};
