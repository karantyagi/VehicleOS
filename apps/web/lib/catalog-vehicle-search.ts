import { matchSorter, rankings } from "match-sorter";
import {
  formatCatalogVehicleLabel,
  type CatalogVehicleRow,
} from "./supported-vehicle-catalog";

export type CatalogVehicleSearchOptions = {
  limit?: number;
};

export const buildCatalogSearchText = (row: CatalogVehicleRow): string =>
  [
    row.year,
    String(row.year).slice(-2),
    row.make,
    row.model,
    row.trim,
    row.powertrain,
    formatCatalogVehicleLabel(row),
    row.packId.replace(/-/g, " "),
  ]
    .filter(Boolean)
    .join(" ");

export const searchCatalogVehicles = (
  rows: CatalogVehicleRow[],
  query: string,
  options: CatalogVehicleSearchOptions = {},
): CatalogVehicleRow[] => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = options.limit ?? 20;

  return matchSorter(rows, trimmed, {
    keys: [{ key: buildCatalogSearchText, threshold: rankings.MATCHES }],
  }).slice(0, limit);
};
