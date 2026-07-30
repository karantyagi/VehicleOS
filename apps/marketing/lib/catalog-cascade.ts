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

const normalize = (value: string): string => value.trim().toLowerCase();

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

export const sortCatalogVehicles = (rows: CatalogVehicleRow[]): CatalogVehicleRow[] =>
  [...rows].sort((a, b) => {
    const make = a.make.localeCompare(b.make);
    if (make !== 0) return make;
    const model = a.model.localeCompare(b.model);
    if (model !== 0) return model;
    if (a.year !== b.year) return b.year - a.year;
    return a.trim.localeCompare(b.trim);
  });

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
  if (!row.powertrain?.trim()) return row.trim;
  const trimNorm = row.trim.trim().toLowerCase();
  const powertrainNorm = row.powertrain.trim().toLowerCase();
  if (trimNorm === powertrainNorm || trimNorm.includes(powertrainNorm)) return row.trim;
  return `${row.trim} · ${row.powertrain.trim()}`;
};

export const formatCatalogVehicleLabel = (
  row: Pick<CatalogVehicleRow, "year" | "make" | "model" | "trim" | "powertrain">,
): string => {
  const trimLabel = formatCatalogTrimOptionLabel(row);
  return `${row.year} ${row.make} ${row.model} ${trimLabel}`;
};

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
        row.trim === trim,
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

export const fetchCatalogVehicles = async (): Promise<CatalogVehicleRow[]> => {
  const response = await fetch("/api/catalog/vehicles");
  if (!response.ok) {
    throw new Error("Could not load vehicle catalog.");
  }

  const body = (await response.json()) as { vehicles: CatalogVehicleRow[] };
  return sortCatalogVehicles(body.vehicles);
};

export const fetchVerifiedCatalogCount = async (): Promise<number> => {
  const response = await fetch("/api/catalog/vehicles?verifiedOnly=true&limit=1");
  if (!response.ok) return 0;
  const body = (await response.json()) as { total?: number; vehicles?: CatalogVehicleRow[] };
  if (typeof body.total === "number") return body.total;
  return body.vehicles?.filter((row) => row.supported).length ?? 0;
};
