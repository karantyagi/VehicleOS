import { describe, expect, it } from "vitest";
import { filterCatalogVehicles, type CatalogVehicleRow } from "./supported-vehicle-catalog";

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

describe("filterCatalogVehicles quick find", () => {
  const rows: CatalogVehicleRow[] = [
    ...acuraTlxRows(2025),
    ...acuraTlxRows(2024),
    ...acuraTlxRows(2021),
  ];

  it("matches tokens in any order (year make model)", () => {
    const matches = filterCatalogVehicles(rows, { q: "2021 Acura TLX" });
    expect(matches.every((row) => row.year === 2021)).toBe(true);
    expect(matches.length).toBe(2);
  });

  it("prioritizes the year token when browsing mixed-year results", () => {
    const matches = filterCatalogVehicles(rows, { q: "Acura TLX 2021" });
    expect(matches[0]?.year).toBe(2021);
  });

  it("tolerates a one-character model typo (TLC → TLX)", () => {
    const matches = filterCatalogVehicles(rows, { q: "Acura TLC" });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((row) => row.model === "TLX")).toBe(true);
  });
});
