export const TIRE_ROTATION_ANCHOR =
  /rotate\s*&\s*inspect\s*tires|tire\s*rotation|rotate\s*tires/i;

const parseMilesFromWindow = (window: string): number[] => {
  const values: number[] = [];
  for (const match of window.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)\s*(?:mi|miles)/gi)) {
    values.push(Number.parseInt(match[1].replace(/,/g, ""), 10));
  }
  return values.filter((miles) => miles >= 3000 && miles <= 30_000);
};

const parseMonthsFromWindow = (window: string): number | null => {
  const months = window.match(/(\d+)\s*(?:months?|mo\b)/i);
  if (months) return Number.parseInt(months[1], 10);
  return null;
};

/** Scan all tire-rotation anchors; ignore wheel-nut retorque windows (<3000 mi). */
export const findTireRotationInterval = (
  text: string,
): { miles: number | null; months: number | null } => {
  const global = new RegExp(TIRE_ROTATION_ANCHOR.source, "gi");
  let bestMiles: number | null = null;
  let bestMonths: number | null = null;
  let match: RegExpExecArray | null;

  while ((match = global.exec(text)) !== null) {
    const window = text.slice(match.index, match.index + 250);
    const milesCandidates = parseMilesFromWindow(window);
    if (milesCandidates.length > 0) {
      const picked = Math.max(...milesCandidates);
      if (bestMiles == null || picked > bestMiles) bestMiles = picked;
    }
    const months = parseMonthsFromWindow(window);
    if (months != null && months <= 24 && (bestMonths == null || months < bestMonths)) {
      bestMonths = months;
    }
  }

  return { miles: bestMiles, months: bestMonths };
};
