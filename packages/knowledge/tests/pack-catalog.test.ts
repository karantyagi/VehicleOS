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
    expect(pack.entries.length).toBeGreaterThanOrEqual(8);
    expect(pack.entries.some((entry) => entry.entryId === "code-b")).toBe(true);
  });

  it("loads full Honda Accord interview fleet pack", () => {
    const pack = loadOemSchedulePack("honda-accord-2024-ex");
    expect(pack.qaStatus).toBe("auto_verified");
    expect(runPackQaRules(pack)).toEqual([]);
    expect(pack.entries.length).toBeGreaterThanOrEqual(8);
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

  it("resolves Ayush dogfood 2022 Hyundai Elantra SEL", () => {
    const packId = resolvePackIdForVehicle({
      make: "Hyundai",
      model: "Elantra",
      year: 2022,
      trim: "SEL",
    });
    expect(packId).toBe("hyundai-elantra-2022-sel");
  });

  it("loads 2022 Elantra SEL dogfood pack", () => {
    const pack = loadOemSchedulePack("hyundai-elantra-2022-sel");
    expect(pack.qaStatus).toBe("auto_verified");
    expect(pack.entries.length).toBeGreaterThanOrEqual(8);
    expect(pack.entries.some((entry) => entry.entryId === "engine-oil")).toBe(true);
  });

  it("loads alias bundles", () => {
    const bundles = loadServiceAliasBundles();
    expect(bundles.length).toBeGreaterThan(0);
    const phrases = bundles.flatMap((bundle) => bundle.aliases.map((alias) => alias.phrase));
    expect(phrases).toContain("Oil and filter changed");
  });

  it("catalog lists interview verified fleet only", () => {
    const catalog = loadSupportedVehicleCatalog();
    expect(catalog.vehicles.length).toBeGreaterThanOrEqual(25);
    expect(catalog.vehicles.length).toBeLessThanOrEqual(35);
    const verified = catalog.vehicles.filter((row) => row.qaStatus === "auto_verified");
    expect(verified).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ packId: "acura-tlx-2021-sh-awd" }),
        expect.objectContaining({ packId: "honda-accord-2024-ex" }),
        expect.objectContaining({ packId: "subaru-forester-2024-premium" }),
      ]),
    );
    expect(verified.every((row) => row.scheduleDepth === "verified")).toBe(true);
  });
});
