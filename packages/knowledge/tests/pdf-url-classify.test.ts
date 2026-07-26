import { describe, expect, it } from "vitest";
import { mergeProvenanceUrls, isMirrorUrl, partitionUrls } from "../src/factory/pdf-url-classify.js";

describe("pdf-url-classify", () => {
  it("detects known mirror hosts", () => {
    expect(isMirrorUrl("https://manuals.startmycar.com/published/foo.pdf")).toBe(true);
    expect(isMirrorUrl("https://manuals.opinautos.com/published/foo.pdf")).toBe(true);
    expect(isMirrorUrl("https://owners.kia.com/us/en/manuals.html")).toBe(false);
  });

  it("partitions mirror vs official URLs", () => {
    expect(
      partitionUrls([
        "https://owners.kia.com/us/en/manuals.html",
        "https://manuals.startmycar.com/published/Kia-K5_2024_EN_US_e6ae80d227.pdf",
      ]),
    ).toEqual({
      officialUrls: ["https://owners.kia.com/us/en/manuals.html"],
      mirrorUrls: ["https://manuals.startmycar.com/published/Kia-K5_2024_EN_US_e6ae80d227.pdf"],
    });
  });

  it("keeps download mirror out of officialUrls on merge", () => {
    const merged = mergeProvenanceUrls({
      existingOfficial: ["https://owners.kia.com/us/en/manuals.html"],
      existingMirror: ["https://manuals.startmycar.com/published/Kia-K5_2024_EN_US_e6ae80d227.pdf"],
      downloadUrl: "https://manuals.startmycar.com/published/Kia-K5_2024_EN_US_e6ae80d227.pdf",
    });

    expect(merged.officialUrls).toEqual(["https://owners.kia.com/us/en/manuals.html"]);
    expect(merged.mirrorUrls).toEqual([
      "https://manuals.startmycar.com/published/Kia-K5_2024_EN_US_e6ae80d227.pdf",
    ]);
  });

  it("routes direct OEM PDF downloads to officialUrls", () => {
    const merged = mergeProvenanceUrls({
      specOfficial: ["https://owners.honda.com/static/pdfs/2024/CR-V/2024_CR-V_Maintenance_Minder_System.pdf"],
      downloadUrl: "https://owners.honda.com/static/pdfs/2024/CR-V/2024_CR-V_Maintenance_Minder_System.pdf",
    });

    expect(merged.officialUrls).toEqual([
      "https://owners.honda.com/static/pdfs/2024/CR-V/2024_CR-V_Maintenance_Minder_System.pdf",
    ]);
    expect(merged.mirrorUrls).toEqual([]);
  });
});
