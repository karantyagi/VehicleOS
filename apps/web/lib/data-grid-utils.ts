export type SortDirection = "asc" | "desc";

export function filterByQuery<T>(rows: T[], query: string, pickText: (row: T) => string): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;
  return rows.filter((row) => pickText(row).toLowerCase().includes(normalized));
}

export function sortRows<T>(rows: T[], compare: (a: T, b: T) => number, direction: SortDirection): T[] {
  const sorted = [...rows].sort(compare);
  return direction === "asc" ? sorted : sorted.reverse();
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
