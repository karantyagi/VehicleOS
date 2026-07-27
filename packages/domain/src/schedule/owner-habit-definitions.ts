export type OwnerHabitDefinition = {
  entryId: string;
  serviceName: string;
  lineItemPattern: RegExp;
};

export const OWNER_HABIT_DEFINITIONS: OwnerHabitDefinition[] = [
  {
    entryId: "owner-habit:techron",
    serviceName: "Fuel system cleaner (Techron)",
    lineItemPattern: /techron|fuel system cleaner/i,
  },
  {
    entryId: "owner-habit:fuel-additive",
    serviceName: "Fuel system additive",
    lineItemPattern: /fuel system additive|fuel additive added/i,
  },
];

export const isOwnerHabitEntryId = (entryId: string): boolean => entryId.startsWith("owner-habit:");
