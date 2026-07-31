import { describe, expect, it } from "vitest";
import {
  buildCroppedReceiptFileName,
  normalizeQuarterTurn,
  resolveReceiptCropTransform,
  rotatedImageSize,
} from "./photo-crop";

describe("receipt photo crop math", () => {
  it("normalizes rotation to supported quarter turns", () => {
    expect(normalizeQuarterTurn(-90)).toBe(270);
    expect(normalizeQuarterTurn(450)).toBe(90);
    expect(normalizeQuarterTurn(42)).toBe(0);
  });

  it("swaps image dimensions for portrait quarter turns", () => {
    expect(rotatedImageSize({ width: 4000, height: 3000, rotation: 90 })).toEqual({
      width: 3000,
      height: 4000,
    });
  });

  it("uses cover scale and clamps drag offsets inside the crop frame", () => {
    const transform = resolveReceiptCropTransform({
      sourceWidth: 4000,
      sourceHeight: 3000,
      frameWidth: 1200,
      frameHeight: 1600,
      rotation: 0,
      zoom: 1,
      offsetX: 10_000,
      offsetY: -10_000,
    });

    expect(transform.scale).toBeCloseTo(1600 / 3000);
    expect(transform.maxOffsetX).toBeCloseTo((4000 * transform.scale - 1200) / 2);
    expect(transform.maxOffsetY).toBe(0);
    expect(transform.offsetX).toBe(transform.maxOffsetX);
    expect(transform.offsetY).toBe(0);
  });

  it("keeps cropped uploads identifiable as JPEG files", () => {
    expect(buildCroppedReceiptFileName("service.receipt.HEIC")).toBe(
      "service.receipt-cropped.jpg",
    );
    expect(buildCroppedReceiptFileName("photo")).toBe("photo-cropped.jpg");
  });
});
