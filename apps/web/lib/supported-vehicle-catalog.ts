export type CatalogVehicleRow = {
  packId: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  powertrain: string | null;
  supported: boolean;
  qaStatus: string;
  supportTier: string | null;
};

export const formatCatalogVehicleLabel = (
  row: Pick<CatalogVehicleRow, "year" | "make" | "model" | "trim" | "powertrain">,
): string => {
  const powertrain = row.powertrain ? ` · ${row.powertrain}` : "";
  return `${row.year} ${row.make} ${row.model} ${row.trim}${powertrain}`;
};

export const sortCatalogVehicles = (rows: CatalogVehicleRow[]): CatalogVehicleRow[] =>
  [...rows].sort((a, b) => {
    const make = a.make.localeCompare(b.make);
    if (make !== 0) return make;
    const model = a.model.localeCompare(b.model);
    if (model !== 0) return model;
    if (a.year !== b.year) return b.year - a.year;
    return a.trim.localeCompare(b.trim);
  });

export const fetchVerifiedCatalogVehicles = async (apiBase = ""): Promise<CatalogVehicleRow[]> => {
  const response = await fetch(`${apiBase}/api/catalog/vehicles?verifiedOnly=true`);
  if (!response.ok) {
    throw new Error("Could not load supported vehicle catalog.");
  }

  const body = (await response.json()) as { vehicles: CatalogVehicleRow[] };
  return sortCatalogVehicles(body.vehicles.filter((row) => row.supported));
};
