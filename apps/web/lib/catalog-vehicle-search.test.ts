import { describe, expect, it } from "vitest";
import { searchCatalogVehicles } from "./catalog-vehicle-search";
import { type CatalogVehicleRow } from "./supported-vehicle-catalog";

const acuraTlxRows = (year: number): CatalogVehicleRow[] => [
  {
    packId: `acura-tlx-${year}-technology`,
    make: "Acura",
    model: "TLX",
    year,
    trim: "Technology",
    powertrain: null,
    supported: true,
    qaStatus: "auto_verified",
    supportTier: "tier2",
  },
  {
    packId: `acura-tlx-${year}-base`,
    make: "Acura",
    model: "TLX",
    year,
    trim: "Base",
    powertrain: null,
    supported: true,
    qaStatus: "auto_verified",
    supportTier: "tier2",
  },
];

const hondaAccordRow: CatalogVehicleRow = {
  packId: "honda-accord-2022-sport",
  make: "Honda",
  model: "Accord",
  year: 2022,
  trim: "Sport",
  powertrain: "2.0T",
  supported: true,
  qaStatus: "auto_verified",
  supportTier: "tier1",
};

describe("searchCatalogVehicles (match-sorter)", () => {
  const rows: CatalogVehicleRow[] = [
    ...acuraTlxRows(2025),
    ...acuraTlxRows(2024),
    ...acuraTlxRows(2021),
    hondaAccordRow,
  ];

  it("matches tokens in any order and filters to the requested year", () => {
    const matches = searchCatalogVehicles(rows, "2021 Acura TLX");
    expect(matches.every((row) => row.year === 2021)).toBe(true);
    expect(matches).toHaveLength(2);
  });

  it("ranks exact year matches above newer model years", () => {
    const matches = searchCatalogVehicles(rows, "Acura TLX 2021");
    expect(matches[0]?.year).toBe(2021);
  });

  it("tolerates a one-character model typo (TLC → TLX)", () => {
    const matches = searchCatalogVehicles(rows, "Acura TLC");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((row) => row.model === "TLX")).toBe(true);
  });

  it("matches partial trim tokens", () => {
    const matches = searchCatalogVehicles(rows, "2021 acura tlx tech");
    expect(matches.some((row) => row.trim === "Technology")).toBe(true);
  });

  it("matches abbreviated two-digit years", () => {
    const matches = searchCatalogVehicles(rows, "accord 22 sport");
    expect(matches[0]?.packId).toBe("honda-accord-2022-sport");
  });

  it("returns empty results for short queries", () => {
    expect(searchCatalogVehicles(rows, "a")).toHaveLength(0);
  });

  it("returns empty results when a token cannot match any field", () => {
    expect(searchCatalogVehicles(rows, "Acura TLX Camry")).toHaveLength(0);
  });
});
