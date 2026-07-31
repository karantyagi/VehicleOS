import { searchCatalogVehicles } from "./catalog-vehicle-search";

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

const normalizeLabelToken = (value: string): string => value.trim().toLowerCase();

const formatPowertrainSuffix = (
  trim: string,
  powertrain: string | null | undefined,
): string => {
  if (!powertrain?.trim()) return "";
  const trimNorm = normalizeLabelToken(trim);
  const powertrainNorm = normalizeLabelToken(powertrain);
  if (powertrain.trim().toUpperCase() === "SH-AWD" && !trimNorm.includes(powertrainNorm)) {
    return ` ${powertrain.trim()}`;
  }
  if (trimNorm === powertrainNorm) return "";
  if (trimNorm.includes(powertrainNorm)) return "";
  return ` · ${powertrain.trim()}`;
};

export const formatCatalogVehicleLabel = (
  row: Pick<CatalogVehicleRow, "year" | "make" | "model" | "trim" | "powertrain">,
): string => {
  const powertrain = formatPowertrainSuffix(row.trim, row.powertrain);
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
  const make = filter.make ? normalize(filter.make) : "";
  const model = filter.model ? normalize(filter.model) : "";
  const year = filter.year;

  const filtered = rows.filter((row) => {
    if (make && normalize(row.make) !== make) return false;
    if (model && normalize(row.model) !== model) return false;
    if (year && row.year !== year) return false;
    return true;
  });

  const q = filter.q?.trim() ?? "";
  if (!q) return sortCatalogVehicles(filtered);

  return searchCatalogVehicles(filtered, q, { limit: filtered.length });
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
): string => `${row.trim}${formatPowertrainSuffix(row.trim, row.powertrain)}`;

/** Unique list/combobox identity — packId alone is reused across model years. */
export const catalogVehicleRowKey = (row: Pick<CatalogVehicleRow, "packId" | "year">): string =>
  `${row.packId}::${row.year}`;

export const isSameCatalogVehicleRow = (
  a: Pick<CatalogVehicleRow, "packId" | "year">,
  b: Pick<CatalogVehicleRow, "packId" | "year">,
): boolean => a.packId === b.packId && a.year === b.year;

export const findCatalogVehicleRow = (
  rows: CatalogVehicleRow[],
  lookup: {
    packId?: string;
    make?: string;
    model?: string;
    year?: number;
    trim?: string;
  },
): CatalogVehicleRow | null => {
  const { packId, make, model, year, trim } = lookup;

  if (packId && year != null && year > 0) {
    const exact = rows.find((row) => row.packId === packId && row.year === year);
    if (exact) return exact;
  }

  if (make && model && year != null && year > 0 && trim) {
    const byTrim = rows.find(
      (row) =>
        row.make === make &&
        row.model === model &&
        row.year === year &&
        (row.trim === trim || formatCatalogTrimOptionLabel(row) === trim),
    );
    if (byTrim) return byTrim;
  }

  if (packId) {
    const matches = rows.filter((row) => row.packId === packId);
    if (matches.length === 0) return null;
    return [...matches].sort((a, b) => a.year - b.year)[0] ?? null;
  }

  return null;
};

export const findCatalogVehicleByPackId = (
  rows: CatalogVehicleRow[],
  packId: string,
  year?: number,
): CatalogVehicleRow | null => findCatalogVehicleRow(rows, { packId, year });
