import { describe, expect, it } from "vitest";
import { parseOwnerHabitNote, validateOwnerHabitProposal } from "./parse-owner-habit-note.js";

describe("parseOwnerHabitNote", () => {
  it("extracts a Techron mileage habit from text", () => {
    expect(parseOwnerHabitNote({
      text: "I add Chevron Techron every 3,000 miles",
      captureChannel: "text",
    })).toMatchObject({
      version: "1",
      entryId: "owner-habit:techron",
      intervalMiles: 3_000,
      intervalMonths: null,
      basis: "mileage",
      captureChannel: "text",
      extractionMethod: "rules",
    });
  });

  it("accepts compact 3k voice phrasing", () => {
    expect(parseOwnerHabitNote({
      text: "Use fuel system cleaner every 3k miles",
      captureChannel: "voice",
    })?.intervalMiles).toBe(3_000);
  });

  it("requires a supported habit and interval", () => {
    expect(parseOwnerHabitNote({ text: "I like Techron", captureChannel: "text" })).toBeNull();
    expect(validateOwnerHabitProposal({
      version: "1",
      entryId: "owner-habit:unknown",
      serviceName: "Unknown",
      intervalMiles: 1_000,
      intervalMonths: null,
      basis: "mileage",
      captureChannel: "text",
      extractionMethod: "llm",
      sourceText: "Unknown habit every 1000 miles",
      confidence: 0.8,
    })).toBe("This owner habit is not supported yet.");
  });
});
