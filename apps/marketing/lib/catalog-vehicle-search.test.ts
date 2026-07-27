import { describe, expect, it } from "vitest";
import { searchCatalogVehicles } from "./catalog-vehicle-search";
import { type CatalogVehicleRow } from "./catalog-cascade";

const sampleRows: CatalogVehicleRow[] = [
  {
    packId: "acura-tlx-2021-technology",
    make: "Acura",
    model: "TLX",
    year: 2021,
    trim: "Technology",
    powertrain: null,
    supported: true,
    qaStatus: "auto_verified",
    supportTier: "tier2",
  },
  {
    packId: "honda-accord-2022-sport",
    make: "Honda",
    model: "Accord",
    year: 2022,
    trim: "Sport",
    powertrain: "2.0T",
    supported: true,
    qaStatus: "auto_verified",
    supportTier: "tier1",
  },
];

describe("searchCatalogVehicles (marketing)", () => {
  it("matches year make model in any order", () => {
    const matches = searchCatalogVehicles(sampleRows, "2021 Acura TLX");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.packId).toBe("acura-tlx-2021-technology");
  });

  it("matches abbreviated two-digit years", () => {
    const matches = searchCatalogVehicles(sampleRows, "accord 22 sport");
    expect(matches[0]?.packId).toBe("honda-accord-2022-sport");
  });
});
