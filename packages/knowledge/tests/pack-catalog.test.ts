import { describe, expect, it } from "vitest";
import {
  loadOemSchedulePack,
  loadServiceAliasBundles,
  loadSupportedVehicleCatalog,
  runPackQaRules,
  resolvePackIdForVehicle,
} from "../src/index.js";

describe("OEM schedule packs", () => {
  it("loads and validates 2021 TLX SH-AWD dogfood pack", () => {
    const pack = loadOemSchedulePack("acura-tlx-2021-sh-awd");
    expect(pack.qaStatus).toBe("auto_verified");
    expect(runPackQaRules(pack)).toEqual([]);
    expect(pack.entries.some((entry) => entry.entryId === "code-b")).toBe(true);
  });

  it("loads promoted 2019 TLX pack after Phase C", () => {
    const pack = loadOemSchedulePack("acura-tlx-2019-sh-awd");
    expect(pack.qaStatus).toBe("auto_verified");
    expect(runPackQaRules(pack)).toEqual([]);
  });

  it("resolves dogfood vehicle to 2021 pack", () => {
    const packId = resolvePackIdForVehicle({
      make: "Acura",
      model: "TLX",
      year: 2021,
      trim: "SH-AWD",
    });
    expect(packId).toBe("acura-tlx-2021-sh-awd");
  });

  it("resolves compound Technology SH-AWD trim to SH-AWD pack", () => {
    const packId = resolvePackIdForVehicle({
      make: "Acura",
      model: "TLX",
      year: 2021,
      trim: "Technology SH-AWD",
    });
    expect(packId).toBe("acura-tlx-2021-sh-awd");
  });

  it("loads alias bundles", () => {
    const bundles = loadServiceAliasBundles();
    expect(bundles.length).toBeGreaterThan(0);
    const phrases = bundles.flatMap((bundle) => bundle.aliases.map((alias) => alias.phrase));
    expect(phrases).toContain("Oil and filter changed");
  });

  it("catalog lists Tier-1 plus Tier-2 packs", () => {
    const catalog = loadSupportedVehicleCatalog();
    expect(catalog.vehicles.length).toBeGreaterThanOrEqual(2000);
    const verified = catalog.vehicles.filter((row) => row.qaStatus === "auto_verified");
    expect(verified).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ packId: "acura-tlx-2021-sh-awd" }),
        expect.objectContaining({ packId: "honda-accord-2024-ex" }),
        expect.objectContaining({ packId: "honda-cr-v-2024-ex" }),
      ]),
    );
    expect(verified.length).toBeGreaterThanOrEqual(50);
    expect(verified).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ packId: "kia-k5-2024-lxs" }),
        expect.objectContaining({ packId: "kia-ev6-2024-light" }),
      ]),
    );
  });
});
