import { describe, expect, it } from "vitest";
import { InMemoryEventStore } from "../adapters/in-memory-event-store.js";
import { foldEvents } from "../projections/apply.js";
import { parseOwnerHabitNote } from "./parse-owner-habit-note.js";
import { recordOwnerHabitProposal } from "./record-owner-habit-proposal.js";

describe("recordOwnerHabitProposal", () => {
  it("creates one owner interval verification task", async () => {
    const eventStore = new InMemoryEventStore();
    const proposal = parseOwnerHabitNote({
      text: "I add Techron every 3,000 miles",
      captureChannel: "voice",
    })!;

    const first = await recordOwnerHabitProposal({ eventStore, vehicleId: "veh-1", proposal });
    const second = await recordOwnerHabitProposal({ eventStore, vehicleId: "veh-1", proposal });
    const state = foldEvents("veh-1", await eventStore.loadAll());

    expect(first.created).toBe(true);
    expect(second).toEqual({ taskId: first.taskId, created: false });
    expect(state.nowQueue[0]).toMatchObject({
      verificationCode: "VERIFY_OWNER_INTERVAL",
      suggestedIntervalMiles: 3_000,
      ruleId: "interval.policy.owner-habit:techron.v1",
    });
  });
});
