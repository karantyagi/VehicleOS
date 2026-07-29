import type { IntervalOverlayMemory, OwnerContextMemory } from "./types.js";

export const mergeIntervalOverlayMemory = (input: {
  memory?: OwnerContextMemory | null;
  entryId: string;
  overlay: IntervalOverlayMemory;
}): OwnerContextMemory => ({
  ...(input.memory ?? {}),
  intervalOverlays: {
    ...(input.memory?.intervalOverlays ?? {}),
    [input.entryId]: input.overlay,
  },
});

export const resolveIntervalForEntry = (input: {
  entryId: string;
  oemIntervalMonths: number | null;
  oemIntervalMiles: number | null;
  ownerContextMemory?: OwnerContextMemory | null;
}): {
  intervalMonths: number | null;
  intervalMiles: number | null;
  usesOwnerOverlay: boolean;
  overlayLabel?: string;
} => {
  const overlay = input.ownerContextMemory?.intervalOverlays?.[input.entryId];
  if (!overlay) {
    return {
      intervalMonths: input.oemIntervalMonths,
      intervalMiles: input.oemIntervalMiles,
      usesOwnerOverlay: false,
    };
  }

  if (overlay.basis === "mileage") {
    return {
      intervalMonths: null,
      intervalMiles: overlay.intervalMiles ?? input.oemIntervalMiles,
      usesOwnerOverlay: true,
      overlayLabel: overlay.label,
    };
  }

  if (overlay.basis === "time") {
    return {
      intervalMonths: overlay.intervalMonths ?? input.oemIntervalMonths,
      intervalMiles: null,
      usesOwnerOverlay: true,
      overlayLabel: overlay.label,
    };
  }

  return {
    intervalMonths: overlay.intervalMonths ?? input.oemIntervalMonths,
    intervalMiles: overlay.intervalMiles ?? input.oemIntervalMiles,
    usesOwnerOverlay: true,
    overlayLabel: overlay.label,
  };
};
