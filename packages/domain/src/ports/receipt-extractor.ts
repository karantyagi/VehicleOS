import type { ExtractedServiceFields } from "../events/catalog.js";

export type ReceiptExtractInput = {
  storageKey: string;
  channel?: "receipt_upload" | "photo" | "manual";
  hintText?: string | null;
  shop?: string;
  serviceDate?: string;
  mileage?: number;
  lineItems?: string[];
  total?: string;
};

export type ReceiptExtractResult = ExtractedServiceFields & {
  source: "heuristic" | "llm" | "owner";
};

export interface ReceiptExtractorPort {
  extract(input: ReceiptExtractInput): Promise<ReceiptExtractResult>;
}

/** Rules-first extractor — swap for vehicleos-engine LLM (ENG-2). */
export const heuristicReceiptExtract = async (
  input: ReceiptExtractInput,
): Promise<ReceiptExtractResult> => {
  const hintParts = [input.hintText ?? "", ...(input.lineItems ?? [])].filter(Boolean);
  const hint = hintParts.join("\n");

  const lineItemsFromHint =
    input.lineItems?.map((line) => line.trim()).filter(Boolean) ??
    (hint.length > 0
      ? hint
          .split(/[\n,;]+/)
          .map((line) => line.trim())
          .filter((line) => line.length > 2 && !/^note:/i.test(line))
          .slice(0, 12)
      : []);

  const lineItems = lineItemsFromHint.length > 0 ? lineItemsFromHint : ["See uploaded receipt"];

  const mileageMatch = hint.match(/(\d{1,3}(?:,\d{3})+|\d{4,6})\s*(?:mi|miles|mileage)?/i);
  const parsedMileage = mileageMatch ? Number(mileageMatch[1]!.replace(/,/g, "")) : undefined;

  const dateMatch = hint.match(/(\d{4}-\d{2}-\d{2})/);
  const totalMatch = hint.match(/\$\s?\d+(?:\.\d{2})?/);

  const shopFromHint = input.shop?.trim();
  const shopFromText = hint.match(
    /(?:at|from)\s+([A-Za-z0-9][A-Za-z0-9\s&'.-]{2,40})(?:\s+on|\s+\d|\s*$)/i,
  )?.[1];

  return {
    shop:
      shopFromHint ||
      shopFromText?.trim() ||
      (/jiffy|valvoline|dealer|toyota|acura|honda|costco|firestone/i.test(hint)
        ? "Service shop"
        : "Service receipt"),
    serviceDate: input.serviceDate ?? dateMatch?.[1] ?? new Date().toISOString().slice(0, 10),
    mileage: input.mileage ?? parsedMileage ?? 0,
    lineItems,
    total: input.total ?? totalMatch?.[0] ?? "$0.00",
    confidence: hint.length > 40 || lineItemsFromHint.length >= 2 ? 0.78 : 0.58,
    source: "heuristic",
  };
};
