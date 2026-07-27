import { describe, expect, it } from "vitest";
import { classifyCaptureIntent } from "./classify-capture-intent.js";

describe("classifyCaptureIntent", () => {
  it("routes RMV PDFs to ownership", () => {
    const result = classifyCaptureIntent({ filename: "myRMV-registration-renewal.pdf" });
    expect(result.route).toBe("ownership");
    expect(result.intent).toBe("ownership_renewal");
  });

  it("routes receipt photos to maintenance", () => {
    const result = classifyCaptureIntent({
      filename: "dealer-service-receipt.jpg",
      channel: "photo",
      mimeType: "image/jpeg",
    });
    expect(result.route).toBe("maintenance");
  });

  it("routes Techron notes to preferences", () => {
    const result = classifyCaptureIntent({ hintText: "Techron every 3000 miles preference" });
    expect(result.route).toBe("preferences");
  });
});
