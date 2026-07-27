import type { ExtractedServiceFields } from "../events/catalog.js";
import type { ReceiptExtractResult } from "./receipt-extractor.js";

export type ReceiptExtractHints = {
  shop?: string;
  serviceDate?: string;
  mileage?: number;
  lineItems?: string[];
  total?: string;
};

/** Owner-entered fields win; extracted values fill gaps (ENG-2 sync path). */
export const mergeReceiptExtractWithHints = (
  extracted: ReceiptExtractResult,
  hints: ReceiptExtractHints,
): ExtractedServiceFields => {
  const hintLineItems = hints.lineItems?.map((line) => line.trim()).filter(Boolean) ?? [];
  const extractedLineItems = extracted.lineItems.map((line) => line.trim()).filter(Boolean);

  return {
    shop: hints.shop?.trim() || extracted.shop,
    serviceDate: hints.serviceDate?.trim() || extracted.serviceDate,
    mileage:
      hints.mileage !== undefined && Number.isFinite(hints.mileage)
        ? hints.mileage
        : extracted.mileage,
    lineItems: hintLineItems.length > 0 ? hintLineItems : extractedLineItems,
    total: hints.total?.trim() || extracted.total,
    confidence: extracted.confidence,
  };
};
