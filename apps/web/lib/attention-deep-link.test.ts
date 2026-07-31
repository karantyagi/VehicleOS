import { describe, expect, it } from "vitest";
import {
  buildOwnerAttentionDeepLink,
  buildMaintenanceItemDeepLink,
  parseMaintenanceItemDeepLink,
  parseOwnerAttentionDeepLink,
} from "./attention-deep-link";

describe("owner attention deep links", () => {
  it("round-trips the exact reminder task", () => {
    const href = buildOwnerAttentionDeepLink("task:rotate tires/2026");
    expect(href).toBe("/?attention=task%3Arotate%20tires%2F2026");
    expect(parseOwnerAttentionDeepLink(href.slice(1))).toBe("task:rotate tires/2026");
  });

  it("ignores missing or blank task ids", () => {
    expect(parseOwnerAttentionDeepLink("")).toBeNull();
    expect(parseOwnerAttentionDeepLink("?attention=%20%20")).toBeNull();
  });

  it("targets one expanded maintenance item without claiming notification delivery", () => {
    const href = buildMaintenanceItemDeepLink("mm-sub-1");
    expect(href).toBe("/?maintenance=mm-sub-1");
    expect(parseMaintenanceItemDeepLink(href.slice(1))).toBe("mm-sub-1");
  });
});
