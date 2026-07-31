import { describe, expect, it } from "vitest";
import {
  catalogVehicleRowKey,
  filterCatalogVehicles,
  findCatalogVehicleRow,
  formatCatalogTrimOptionLabel,
  formatCatalogVehicleLabel,
  type CatalogVehicleRow,
} from "./supported-vehicle-catalog";

const sharedPackRows = (): CatalogVehicleRow[] =>
  [2021, 2022, 2023, 2024, 2025, 2026].map((year) => ({
    packId: "acura-tlx-2021-technology",
    make: "Acura",
    model: "TLX",
    year,
    trim: "Technology",
    powertrain: null,
    supported: true,
    qaStatus: "auto_verified",
    supportTier: "tier1",
  }));

describe("findCatalogVehicleRow", () => {
  it("disambiguates shared packId by model year", () => {
    const rows = sharedPackRows();
    expect(findCatalogVehicleRow(rows, { packId: "acura-tlx-2021-technology", year: 2021 })?.year).toBe(
      2021,
    );
    expect(findCatalogVehicleRow(rows, { packId: "acura-tlx-2021-technology", year: 2026 })?.year).toBe(
      2026,
    );
  });

  it("falls back to earliest year when packId is reused without a year hint", () => {
    const rows = sharedPackRows();
    expect(findCatalogVehicleRow(rows, { packId: "acura-tlx-2021-technology" })?.year).toBe(2021);
  });

  it("assigns unique combobox keys per model year for shared packId", () => {
    const rows = sharedPackRows();
    const keys = rows.map(catalogVehicleRowKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("catalog vehicle labels", () => {
  it("keeps Acura Technology SH-AWD together as one named configuration", () => {
    expect(formatCatalogTrimOptionLabel({ trim: "Technology", powertrain: "SH-AWD" })).toBe(
      "Technology SH-AWD",
    );
    expect(
      formatCatalogVehicleLabel({
        year: 2021,
        make: "Acura",
        model: "TLX",
        trim: "Technology",
        powertrain: "SH-AWD",
      }),
    ).toBe("2021 Acura TLX Technology SH-AWD");
  });
});

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
