import { describe, expect, it } from "vitest";
import {
  findLastMatchingService,
  findMatchingServices,
  serviceNamePattern,
} from "./match-service-name.js";
import { compileServiceAliasRegistry } from "./service-alias-registry.js";
import type { ServiceTimelineEntry } from "../projections/types.js";

const timelineRow = (overrides: Partial<ServiceTimelineEntry>): ServiceTimelineEntry => ({
  serviceId: "svc-1",
  shop: "Dealer",
  serviceDate: "2026-05-13",
  mileage: 57_160,
  lineItems: ["Oil and filter changed"],
  total: "$0.00",
  evidenceIds: [],
  source: "carfax_import",
  ...overrides,
});

describe("match-service-name", () => {
  it("matches CARFAX oil and filter changed to OEM oil service names", () => {
    const timeline = [timelineRow({})];
    const oemName = "Replace engine oil and filter (Maintenance Minder B)";

    expect(serviceNamePattern(oemName).test("Oil and filter changed")).toBe(true);
    expect(findLastMatchingService(timeline, oemName)?.mileage).toBe(57_160);
  });

  it("matches oil & filter shorthand", () => {
    expect(serviceNamePattern("Engine oil & filter").test("Oil & filter replaced")).toBe(true);
  });

  it("matches rear brake pads to rear brake OEM rows", () => {
    const timeline = [
      timelineRow({
        serviceDate: "2026-03-10",
        lineItems: ["Rear brake pads replaced"],
      }),
    ];
    expect(findMatchingServices(timeline, "Rear brake pads").length).toBe(1);
    expect(findMatchingServices(timeline, "Front brake pads").length).toBe(0);
  });

  it("keeps transmission fluid separate from rear differential fluid", () => {
    const transmissionService =
      "Replace transmission and transfer fluid (Maintenance Minder sub 3)";
    const rearDifferentialService =
      "Replace rear differential fluid — SH-AWD (Maintenance Minder sub 6)";

    expect(
      serviceNamePattern(transmissionService).test(
        "Rear differential fluid flushed/changed",
      ),
    ).toBe(false);
    expect(
      serviceNamePattern(rearDifferentialService).test(
        "Rear differential fluid flushed/changed",
      ),
    ).toBe(true);
    expect(
      serviceNamePattern(rearDifferentialService).test(
        "Transmission fluid changed",
      ),
    ).toBe(false);
  });

  it("does not fall back when another known canonical service matches", () => {
    const registry = compileServiceAliasRegistry([
      {
        bundleId: "brake-services",
        aliases: [
          {
            canonicalServiceId: "generic.brake_fluid",
            phrase: "Brake fluid flushed",
            matchKind: "contains",
            priority: 50,
          },
          {
            canonicalServiceId: "generic.front_brake_pads",
            phrase: "Front brake pads replaced",
            matchKind: "contains",
            priority: 50,
          },
        ],
      },
    ]);
    const timeline = [
      timelineRow({
        lineItems: ["Front brake pads replaced"],
      }),
    ];

    expect(
      findMatchingServices(timeline, "Replace brake fluid", {
        canonicalServiceId: "generic.brake_fluid",
        serviceAliasRegistry: registry,
      }),
    ).toHaveLength(0);
  });

  it("does not treat differential gear oil as engine oil service", () => {
    const differentialService = "Inspect front and rear differential gear oil";

    expect(serviceNamePattern(differentialService).test("Oil and filter changed")).toBe(false);
    expect(serviceNamePattern(differentialService).test("Differential gear oil changed")).toBe(true);
  });

  it("returns chronologically last match", () => {
    const timeline = [
      timelineRow({ serviceId: "a", serviceDate: "2024-01-01", lineItems: ["Oil and filter changed"] }),
      timelineRow({ serviceId: "b", serviceDate: "2025-06-01", lineItems: ["Oil and filter changed"] }),
    ];
    expect(findLastMatchingService(timeline, "Engine oil & filter")?.serviceId).toBe("b");
  });

  it("matches Maintenance Minder B via alias registry when regex misses", () => {
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
    ]);
    const timeline = [
      timelineRow({
        lineItems: ["Maintenance Minder B service"],
      }),
    ];
    const oemName = "Replace engine oil and filter (Maintenance Minder B)";

    expect(
      findMatchingServices(timeline, oemName, {
        canonicalServiceId: "acura.mm.b.oil_filter",
        serviceAliasRegistry: registry,
      }).length,
    ).toBe(1);
  });
});
