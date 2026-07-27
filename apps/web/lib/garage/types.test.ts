import { describe, expect, it } from "vitest";
import { isGarageSwitchLocked } from "./types.js";

describe("isGarageSwitchLocked", () => {
  it("locks while import or sync is active", () => {
    expect(isGarageSwitchLocked({ isBusy: false, isRefreshingNow: false, pipelinePhase: "idle", importBusy: true }).locked).toBe(true);
    expect(isGarageSwitchLocked({ isBusy: true, isRefreshingNow: false, pipelinePhase: "idle", importBusy: false }).locked).toBe(true);
    expect(isGarageSwitchLocked({ isBusy: false, isRefreshingNow: false, pipelinePhase: "extracting", importBusy: false }).locked).toBe(true);
  });

  it("allows switch when idle", () => {
    expect(isGarageSwitchLocked({ isBusy: false, isRefreshingNow: false, pipelinePhase: "idle", importBusy: false }).locked).toBe(false);
  });
});
