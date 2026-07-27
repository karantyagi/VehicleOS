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
  scheduleSourceLine?: string | null;
};

export type CatalogVehicleFilter = {
  make?: string;
  model?: string;
  year?: number;
  q?: string;
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

const normalize = (value: string): string => value.trim().toLowerCase();

export const filterCatalogVehicles = (
  rows: CatalogVehicleRow[],
  filter: CatalogVehicleFilter = {},
): CatalogVehicleRow[] => {
  const q = filter.q ? normalize(filter.q) : "";
  const make = filter.make ? normalize(filter.make) : "";
  const model = filter.model ? normalize(filter.model) : "";
  const year = filter.year;

  return sortCatalogVehicles(rows).filter((row) => {
    if (make && normalize(row.make) !== make) return false;
    if (model && normalize(row.model) !== model) return false;
    if (year && row.year !== year) return false;
    if (!q) return true;
    const haystack = [
      row.make,
      row.model,
      String(row.year),
      row.trim,
      row.powertrain ?? "",
      row.packId,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
};

export const fetchVerifiedCatalogVehicles = async (apiBase = ""): Promise<CatalogVehicleRow[]> => {
  const response = await fetch(`${apiBase}/api/catalog/vehicles?verifiedOnly=true`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Could not load supported vehicle catalog.");
  }

  const body = (await response.json()) as { vehicles: CatalogVehicleRow[] };
  return sortCatalogVehicles(body.vehicles.filter((row) => row.supported));
};

export const fetchVerifiedCatalogCount = async (apiBase = ""): Promise<number> => {
  const response = await fetch(`${apiBase}/api/catalog/vehicles?verifiedOnly=true&limit=1`);
  if (!response.ok) return 0;
  const body = (await response.json()) as { total?: number; vehicles?: CatalogVehicleRow[] };
  if (typeof body.total === "number") return body.total;
  return body.vehicles?.filter((row) => row.supported).length ?? 0;
};

const matchesMake = (row: CatalogVehicleRow, make: string): boolean =>
  normalize(row.make) === normalize(make);

const matchesModel = (row: CatalogVehicleRow, make: string, model: string): boolean =>
  matchesMake(row, make) && normalize(row.model) === normalize(model);

const matchesYear = (
  row: CatalogVehicleRow,
  make: string,
  model: string,
  year: number,
): boolean => matchesModel(row, make, model) && row.year === year;

export const listCatalogMakes = (rows: CatalogVehicleRow[]): string[] =>
  Array.from(new Set(rows.map((row) => row.make))).sort((a, b) => a.localeCompare(b));

export const listCatalogModels = (rows: CatalogVehicleRow[], make: string): string[] => {
  if (!make.trim()) return [];
  return Array.from(new Set(rows.filter((row) => matchesMake(row, make)).map((row) => row.model))).sort(
    (a, b) => a.localeCompare(b),
  );
};

export const listCatalogYears = (rows: CatalogVehicleRow[], make: string, model: string): number[] => {
  if (!make.trim() || !model.trim()) return [];
  return Array.from(
    new Set(rows.filter((row) => matchesModel(row, make, model)).map((row) => row.year)),
  ).sort((a, b) => b - a);
};

export const listCatalogTrimRows = (
  rows: CatalogVehicleRow[],
  make: string,
  model: string,
  year: number,
): CatalogVehicleRow[] =>
  sortCatalogVehicles(rows.filter((row) => matchesYear(row, make, model, year)));

export const formatCatalogTrimOptionLabel = (
  row: Pick<CatalogVehicleRow, "trim" | "powertrain">,
): string => {
  const powertrain = row.powertrain ? ` · ${row.powertrain}` : "";
  return `${row.trim}${powertrain}`;
};

export const findCatalogVehicleByPackId = (
  rows: CatalogVehicleRow[],
  packId: string,
): CatalogVehicleRow | null => rows.find((row) => row.packId === packId) ?? null;
