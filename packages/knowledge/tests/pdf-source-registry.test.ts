import { describe, expect, it } from "vitest";
import { resolvePdfSourceSpec } from "../src/factory/pdf-source-registry.js";

const KIA_TIER1_SOURCES = [
  {
    packId: "kia-k5-2024-lxs",
    model: "K5",
    url: "https://manuals.startmycar.com/published/Kia-K5_2024_EN_US_e6ae80d227.pdf",
  },
  {
    packId: "kia-sportage-2024-lx",
    model: "Sportage",
    url: "https://manuals.startmycar.com/published/Kia-Sportage_2024_EN-US_US_979e9e6749.pdf",
  },
  {
    packId: "kia-telluride-2024-lx",
    model: "Telluride",
    url: "https://manuals.startmycar.com/published/Kia-Telluride_2024_EN_US_60a621055c.pdf",
  },
  {
    packId: "kia-ev6-2024-light",
    model: "EV6",
    url: "https://manuals.opinautos.com/published/Kia-EV6_2024_EN-US_US_ef71c5ee49.pdf",
  },
] as const;

describe("Kia Tier-1 PDF sources", () => {
  it.each(KIA_TIER1_SOURCES)("resolves $packId to its verified 2024 U.S. manual", (source) => {
    expect(
      resolvePdfSourceSpec({
        packId: source.packId,
        make: "Kia",
        model: source.model,
        year: 2024,
      }).candidateUrls,
    ).toEqual([source.url]);
  });
});
