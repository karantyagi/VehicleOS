import { describe, expect, it } from "vitest";
import {
  compileServiceAliasRegistry,
  lineMatchesCanonicalService,
} from "./service-alias-registry.js";

describe("service-alias-registry", () => {
  const registry = compileServiceAliasRegistry([
    {
      bundleId: "acura-maintenance-minder",
      aliases: [
        {
          canonicalServiceId: "acura.mm.b.oil_filter",
          phrase: "Maintenance Minder B",
          matchKind: "contains",
          priority: 50,
        },
      ],
    },
    {
      bundleId: "global",
      aliases: [
        {
          canonicalServiceId: "acura.mm.b.oil_filter",
          phrase: "Oil and filter changed",
          matchKind: "contains",
          priority: 100,
        },
      ],
    },
  ]);

  it("matches CARFAX phrasing via alias ontology", () => {
    expect(
      lineMatchesCanonicalService({
        lineItem: "Maintenance Minder B service performed",
        canonicalServiceId: "acura.mm.b.oil_filter",
        registry,
      }),
    ).toBe(true);
  });

  it("matches global dogfood alias phrases", () => {
    expect(
      lineMatchesCanonicalService({
        lineItem: "Oil and filter changed",
        canonicalServiceId: "acura.mm.b.oil_filter",
        registry,
      }),
    ).toBe(true);
  });
});
