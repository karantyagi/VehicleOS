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
  const hint = input.hintText ?? "";
  const lineItems =
    input.lineItems ??
    (hint.length > 0
      ? hint
          .split(/[\n,;]+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 8)
      : ["See uploaded receipt"]);

  const mileageMatch = hint.match(/(\d{1,3}(?:,\d{3})+|\d{4,6})\s*(?:mi|miles)?/i);
  const parsedMileage = mileageMatch ? Number(mileageMatch[1]!.replace(/,/g, "")) : input.mileage;

  return {
    shop: input.shop ?? (/jiffy|valvoline|dealer|toyota|acura|honda/i.test(hint) ? "Service shop" : "Service receipt"),
    serviceDate: input.serviceDate ?? new Date().toISOString().slice(0, 10),
    mileage: parsedMileage ?? input.mileage ?? 0,
    lineItems,
    total: input.total ?? "$0.00",
    confidence: hint.length > 20 ? 0.72 : 0.55,
    source: "heuristic",
  };
};
