const NOISE_LINE_ITEMS = new Set([
  "vehicle serviced",
  "maintenance inspection completed",
  "vehicle washed/detailed",
  "vehicle washed",
  "multi-point inspection",
]);

const normalizeLineItemKey = (line: string): string => line.trim().toLowerCase().replace(/\s+/g, " ");

export const isCarfaxNoiseLineItem = (line: string): boolean =>
  NOISE_LINE_ITEMS.has(normalizeLineItemKey(line));

export const normalizeCarfaxLineItems = (lineItems: string[]): string[] => {
  const deduped = [...new Set(lineItems.map((line) => line.trim()).filter(Boolean))];
  const meaningful = deduped.filter((line) => !isCarfaxNoiseLineItem(line));

  if (meaningful.length > 0) return meaningful;

  const inspectionOnly = deduped.filter((line) =>
    /inspection|emissions|safety/i.test(line),
  );
  if (inspectionOnly.length > 0) return inspectionOnly;

  if (deduped.length > 0) return ["Service visit"];

  return lineItems;
};
