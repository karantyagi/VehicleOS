export type MaintenanceQuickItemGroup =
  | "common"
  | "fluids"
  | "filters"
  | "brakes_tires"
  | "owner_habit"
  | "rmv";

export type MaintenanceQuickItem = {
  id: string;
  label: string;
  lineItem: string;
  group: MaintenanceQuickItemGroup;
};

export const MAINTENANCE_QUICK_ITEM_GROUPS: { id: MaintenanceQuickItemGroup; label: string }[] = [
  { id: "common", label: "Common" },
  { id: "fluids", label: "Fluids" },
  { id: "filters", label: "Filters" },
  { id: "brakes_tires", label: "Brakes & tires" },
  { id: "owner_habit", label: "Your habits" },
  { id: "rmv", label: "RMV / registration" },
];

export const MAINTENANCE_QUICK_ITEMS: MaintenanceQuickItem[] = [
  { id: "oil", label: "Oil + filter", lineItem: "Oil and filter changed", group: "common" },
  { id: "rotate", label: "Tire rotation", lineItem: "Tires rotated", group: "common" },
  { id: "brake-inspect", label: "Brake inspect", lineItem: "Brakes checked", group: "common" },
  { id: "atf", label: "Transmission fluid", lineItem: "Transmission fluid changed", group: "fluids" },
  { id: "rear-diff", label: "Rear diff fluid", lineItem: "Rear differential fluid flushed/changed", group: "fluids" },
  { id: "brake-fluid", label: "Brake fluid", lineItem: "Brake fluid flushed/changed", group: "fluids" },
  { id: "coolant", label: "Coolant", lineItem: "Antifreeze/coolant flushed/changed", group: "fluids" },
  { id: "engine-air", label: "Engine air filter", lineItem: "Air filter replaced", group: "filters" },
  { id: "cabin-air", label: "Cabin filter", lineItem: "Cabin air filter replaced/cleaned", group: "filters" },
  { id: "front-brakes", label: "Front pads + rotors", lineItem: "Front brake pads replaced", group: "brakes_tires" },
  { id: "rear-brakes", label: "Rear pads + rotors", lineItem: "Rear brake pads replaced", group: "brakes_tires" },
  { id: "tires", label: "New tires", lineItem: "Four tires replaced", group: "brakes_tires" },
  { id: "alignment", label: "Alignment", lineItem: "Four wheel alignment performed", group: "brakes_tires" },
  {
    id: "techron",
    label: "Chevron Techron",
    lineItem: "Chevron Techron fuel system cleaner added",
    group: "owner_habit",
  },
  {
    id: "fuel-additive",
    label: "Fuel additive",
    lineItem: "Fuel system additive added",
    group: "owner_habit",
  },
  {
    id: "inspection-pass",
    label: "Inspection passed",
    lineItem: "Passed safety inspection",
    group: "rmv",
  },
  {
    id: "emissions-pass",
    label: "Emissions passed",
    lineItem: "Passed emissions inspection",
    group: "rmv",
  },
  {
    id: "registration",
    label: "Registration renewed",
    lineItem: "Registration renewed",
    group: "rmv",
  },
  {
    id: "sticker",
    label: "Inspection sticker",
    lineItem: "Inspection sticker renewed",
    group: "rmv",
  },
];

export const appendQuickLineItem = (current: string, lineItem: string): string => {
  const lines = current
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.some((line) => line.toLowerCase() === lineItem.toLowerCase())) {
    return lines.join("\n");
  }
  return [...lines, lineItem].join("\n");
};
