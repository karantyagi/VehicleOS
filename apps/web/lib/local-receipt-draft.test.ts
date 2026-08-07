import { describe, expect, it } from "vitest";
import { failedReceiptDraftKey, isAcceptedReceiptFile, MAX_RECEIPT_BYTES } from "./local-receipt-draft";

describe("local receipt drafts", () => {
  it("keeps retry files scoped to one vehicle", () => {
    expect(failedReceiptDraftKey("vehicle-1")).toBe("failed-receipt:vehicle-1");
  });

  it("accepts only bounded supported receipt files", () => {
    expect(isAcceptedReceiptFile({ type: "image/jpeg", size: 100 })).toBe(true);
    expect(isAcceptedReceiptFile({ type: "application/pdf", size: MAX_RECEIPT_BYTES })).toBe(true);
    expect(isAcceptedReceiptFile({ type: "text/plain", size: 100 })).toBe(false);
    expect(isAcceptedReceiptFile({ type: "image/png", size: MAX_RECEIPT_BYTES + 1 })).toBe(false);
  });
});
